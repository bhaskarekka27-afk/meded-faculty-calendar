const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '.whatsapp_auth');

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'
    this.qrRaw = null;
    this.qrDataUrl = null;
    this.connectedNumber = null;
    this.connectedName = null;
    this.lastError = null;
    this.reconnectTimer = null;
    this.isInitializing = false;
  }

  getStatus() {
    return {
      status: this.status,
      connected: this.status === 'CONNECTED',
      connectedNumber: this.connectedNumber,
      connectedName: this.connectedName,
      hasQr: !!this.qrDataUrl,
      qrDataUrl: this.qrDataUrl,
      lastError: this.lastError
    };
  }

  async initialize(forceNew = false) {
    if (this.isInitializing) {
      return this.getStatus();
    }
    this.isInitializing = true;

    try {
      if (forceNew) {
        await this.clearAuth();
      }

      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      let version;
      try {
        const vInfo = await fetchLatestBaileysVersion();
        version = vInfo.version;
      } catch (e) {
        version = [2, 3000, 1015901307];
      }

      this.status = 'CONNECTING';
      this.lastError = null;

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: ['PW MedEd Faculty Gateway', 'Chrome', '124.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw = qr;
          this.status = 'QR_READY';
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 280,
              color: {
                dark: '#1e3d2f',
                light: '#ffffff'
              }
            });
          } catch (err) {
            console.error('[WhatsAppService] Error generating QR data URL:', err);
          }
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrRaw = null;
          this.qrDataUrl = null;
          this.lastError = null;

          const userJid = this.sock?.user?.id || '';
          this.connectedNumber = userJid.split(':')[0] || userJid.split('@')[0] || 'Unknown';
          this.connectedName = this.sock?.user?.name || 'PW MedEd Gateway Node';
          console.log(`[WhatsAppService] ✓ WhatsApp Connected Successfully! Node: ${this.connectedNumber}`);
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          this.status = 'DISCONNECTED';
          this.qrRaw = null;
          this.qrDataUrl = null;
          this.connectedNumber = null;
          this.connectedName = null;

          console.log(`[WhatsAppService] Connection closed. Status Code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

          if (shouldReconnect) {
            this.lastError = 'Connection closed unexpectedly. Reconnecting...';
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
              this.initialize(false);
            }, 5000);
          } else {
            this.lastError = 'Device logged out. Please pair again via QR code.';
            await this.clearAuth();
          }
        }
      });

      return this.getStatus();
    } catch (err) {
      console.error('[WhatsAppService] Initialization error:', err);
      this.status = 'DISCONNECTED';
      this.lastError = err.message || 'Initialization failed';
      return this.getStatus();
    } finally {
      this.isInitializing = false;
    }
  }

  async clearAuth() {
    try {
      if (this.sock) {
        try {
          this.sock.end(new Error('Manual session clear'));
        } catch (e) {}
        this.sock = null;
      }
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      this.status = 'DISCONNECTED';
      this.qrRaw = null;
      this.qrDataUrl = null;
      this.connectedNumber = null;
      this.connectedName = null;
      this.lastError = null;
    } catch (err) {
      console.error('[WhatsAppService] Error clearing auth directory:', err);
    }
  }

  async requestPairingCode(phoneNumber) {
    if (!this.sock) {
      await this.initialize(false);
    }
    if (this.status === 'CONNECTED') {
      throw new Error('Already connected to WhatsApp!');
    }
    const cleanDigits = String(phoneNumber || '').replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      throw new Error('Invalid phone number format for pairing code.');
    }
    if (this.sock && typeof this.sock.requestPairingCode === 'function') {
      const code = await this.sock.requestPairingCode(cleanDigits);
      return { success: true, pairingCode: code };
    }
    throw new Error('Pairing code method not supported on current Baileys instance.');
  }

  async sendMessage(targetPhone, messageText) {
    if (this.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp service is not connected. Please pair your institutional phone number in Admin Settings.');
    }

    if (!targetPhone) {
      throw new Error('Target recipient phone number is required.');
    }

    if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
      throw new Error('Message text cannot be empty.');
    }

    // Clean phone digits
    let digits = String(targetPhone).replace(/\D/g, '');
    // If 10 digits (India), prepend 91
    if (digits.length === 10) {
      digits = '91' + digits;
    }

    const jid = `${digits}@s.whatsapp.net`;

    try {
      const result = await this.sock.sendMessage(jid, { text: messageText.trim() });
      return {
        success: true,
        messageId: result?.key?.id,
        recipient: digits,
        jid: jid,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error(`[WhatsAppService] Failed to send message to ${jid}:`, err);
      throw new Error(`WhatsApp send failed: ${err.message || 'Unknown network error'}`);
    }
  }
}

const whatsappServiceInstance = new WhatsAppService();

// Auto-initialize if previous session exists on disk
if (fs.existsSync(AUTH_DIR)) {
  const files = fs.readdirSync(AUTH_DIR);
  if (files.length > 0) {
    console.log('[WhatsAppService] Found existing WhatsApp session token. Auto-connecting in background...');
    whatsappServiceInstance.initialize(false).catch((e) => {
      console.warn('[WhatsAppService] Background auto-connect notice:', e.message);
    });
  }
}

module.exports = whatsappServiceInstance;
