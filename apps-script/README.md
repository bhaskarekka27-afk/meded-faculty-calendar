# Sheet Write-Back — setup

The portal reads the Lecture Planner through Google's public CSV export, which
is read-only. To write approvals back, deploy `Code.gs` as a Web App from the
spreadsheet itself. That way the script already has permission to edit the
sheet and no credentials ever reach the browser.

## 1. Add the script

1. Open the Lecture Planner spreadsheet.
2. **Extensions → Apps Script**.
3. Delete the placeholder `Code.gs` content and paste in this folder's `Code.gs`.
4. Near the top, replace the `SHARED_TOKEN` value with a long random string.
   Generate one however you like, e.g.

   ```
   openssl rand -hex 24
   ```

   Keep it — you paste the same value into the portal in step 3.
5. Save.

## 2. Deploy it

1. **Deploy → New deployment → Web app**.
2. Settings:
   - **Description**: `MedEd status write-back`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
3. **Deploy**, then authorise when prompted (it needs to edit this spreadsheet).
4. Copy the **Web app URL**. It ends in `/exec` — the `/dev` URL will not work
   from the browser.

> "Anyone" controls who may *call* the URL, not who may read your sheet. The
> shared token is what stops anyone else's call from being accepted, so treat
> it like a password. Anyone holding both the URL and the token can write
> status values to this sheet.

## 3. Connect the portal

1. In the admin portal: **Dean menu → Connect Sheet**.
2. Scroll to **Sheet Write-Back**.
3. Paste the `/exec` URL and the same token.
4. **Test connection** — it should name your spreadsheet and list its tabs.
5. **Save**, and leave *Update the sheet on approval* checked.

Settings are stored per browser, so each admin who approves requests does this
once on their own machine.

## What it writes

Five columns, appended to the right of your existing columns on first use and
reused after that. They are found by header name, so you can reorder or insert
columns freely.

| Column | Reschedule | Cancellation |
|---|---|---|
| `Status` | `Rescheduled` | `Cancelled` |
| `Rescheduled Date` | new date, `YYYY-MM-DD` | cleared |
| `Rescheduled Time` | e.g. `6:30 PM to 8:30 PM` | cleared |
| `Rescheduled Duration` | e.g. `2 Hours` | cleared |
| `Status Updated At` | timestamp in the sheet's timezone | timestamp |

The original date, faculty, subject, chapter, topic and timings are **never**
modified — the planned slot stays as the record of what was originally
scheduled, and the new slot lives alongside it.

Every action is also appended to a `Reschedule Log` tab (created automatically)
with the actor, reason and request id. Set `ENABLE_LOG_TAB = false` in
`Code.gs` if you would rather not keep that.

## How the right row is found

The portal sends the row number it last read, plus the row's date, faculty and
topic. The script trusts the row number **only** if the date and faculty there
still match; otherwise it searches the sheet for that combination. So inserting
or deleting rows between syncs cannot cause a write to the wrong lecture.

If two classes share a date *and* faculty, the topic disambiguates. If it still
cannot resolve to exactly one row, it writes nothing and returns an error, which
the portal surfaces as a toast — it never guesses.

## If something goes wrong

Failed writes are queued in the browser and retried automatically on next load,
and there's a **Retry pending** button in the settings panel. The badge shows
how many are outstanding.

| Message | Cause |
|---|---|
| `Invalid token` | Portal token ≠ `SHARED_TOKEN`. Redeploy after changing the script. |
| `Endpoint did not return JSON` | Usually the `/dev` URL, or access not set to "Anyone". |
| `Tab not found` | The batch's tab name doesn't match the sheet. The error lists the real tab names. |
| `Ambiguous: N rows match` | Same date + faculty, and the topic didn't narrow it. Make the topic unique. |
| `SHARED_TOKEN is not set` | Step 1.4 was skipped. |

After editing `Code.gs` you must **Deploy → Manage deployments → Edit → Deploy**
again; saving alone does not update the live Web App.
