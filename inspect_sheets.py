import csv
import json

def analyze_sheet(csv_path):
    print(f"Analyzing {csv_path}...")
    with open(csv_path, mode='r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f)
        header = next(reader)
        print("Header column 0:", header[0])
        print("Header column 1..7:", header[1:8])
        
        records = []
        for i, row in enumerate(reader):
            if not row or not any(row):
                continue
            date_col = row[0].strip() if len(row) > 0 else ""
            faculty = row[1].strip() if len(row) > 1 else ""
            subject = row[2].strip() if len(row) > 2 else ""
            chapter = row[3].strip() if len(row) > 3 else ""
            topic = row[4].strip() if len(row) > 4 else ""
            no_lec = row[5].strip() if len(row) > 5 else ""
            duration = row[6].strip() if len(row) > 6 else ""
            timings = row[7].strip() if len(row) > 7 else ""
            
            records.append({
                "row": i + 2,
                "date": date_col,
                "faculty": faculty,
                "subject": subject,
                "chapter": chapter,
                "topic": topic,
                "noOfLectures": no_lec,
                "duration": duration,
                "timings": timings
            })
            
    print(f"Total valid non-empty rows: {len(records)}")
    print("Sample 3 rows:")
    for r in records[:3]:
        print(" ", r)
    print("Sample holiday/special row:")
    for r in records:
        if "cool off" in r["faculty"].lower() or "diwali" in r["faculty"].lower() or not r["subject"]:
            print(" ", r)
            break

analyze_sheet('sheet1_planner.csv')
print("\n" + "="*50 + "\n")
analyze_sheet('sheet2_planner.csv')
