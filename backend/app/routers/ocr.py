import re
import io
import numpy as np
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import pytesseract

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


def aggressive_preprocess(img: Image.Image):
    """Fast single preprocessing for mobile phone photos."""
    try:
        import cv2
        if img.mode != 'RGB':
            img = img.convert('RGB')
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        img_np = np.array(img)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

        # Resize to 1500px wide max — enough for OCR, not too large
        h, w = gray.shape
        if w < 800:
            scale = 800 / w
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
        elif w > 2000:
            scale = 2000 / w
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        # CLAHE — best single method for uneven lighting
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        result = clahe.apply(gray)
        return [Image.fromarray(result)]

    except Exception as e:
        print(f"Preprocessing error: {e}")
        if img.mode != 'RGB':
            img = img.convert('RGB')
        gray = img.convert('L')
        return [ImageEnhance.Contrast(gray).enhance(2.5)]


def run_ocr_multipass(img: Image.Image) -> tuple:
    """
    Fast single-pass OCR — Hindi+English only.
    Returns (best_text, combined_text)
    """
    preprocessed = aggressive_preprocess(img)
    proc_img = preprocessed[0]

    best_text = ''

    # Single fast pass: Hindi+English, PSM 6 (uniform block)
    for lang in ['hin+eng', 'eng']:
        try:
            text = pytesseract.image_to_string(
                proc_img,
                lang=lang,
                config='--oem 3 --psm 6'
            ).strip()
            if text and len(re.sub(r'[^\u0900-\u097FA-Za-z]', '', text)) > len(re.sub(r'[^\u0900-\u097FA-Za-z]', '', best_text)):
                best_text = text
        except Exception:
            continue

    return best_text, best_text


def parse_fields(text: str) -> dict:
    """Extract structured fields from OCR text."""
    fields = {
        "first_name": "", "last_name": "", "relation_name": "",
        "relation_type": "father", "caste": "", "village": "",
        "phone": "", "address": "",
        "first_name_hi": "", "last_name_hi": "",
        "relation_name_hi": "", "caste_hi": "", "village_hi": "",
    }

    if not text:
        return fields

    lines = [l.strip() for l in text.split('\n') if l.strip()]
    full = ' '.join(lines)

    # Phone
    phone_m = re.search(r'\b([6-9][0-9]{9})\b', full)
    if phone_m:
        fields["phone"] = phone_m.group(1)

    # Hindi patterns
    patterns_hi = [
        ('name_hi',    r'(?:नाम|naam)\s*[:/\-]?\s*([\u0900-\u097F][\u0900-\u097F\s]{1,30})'),
        ('father_hi',  r'(?:पिता|पिताजी|पिता\s*का\s*नाम)\s*[:/\-]?\s*([\u0900-\u097F][\u0900-\u097F\s]{1,30})'),
        ('husband_hi', r'(?:पति|पति\s*का\s*नाम)\s*[:/\-]?\s*([\u0900-\u097F][\u0900-\u097F\s]{1,30})'),
        ('caste_hi',   r'(?:जाति|समाज|जात)\s*[:/\-]?\s*([\u0900-\u097F][\u0900-\u097F\s]{1,20})'),
        ('village_hi', r'(?:गाँव|गांव|ग्राम|गाव)\s*[:/\-]?\s*([\u0900-\u097F][\u0900-\u097F\s]{1,25})'),
        ('state_hi',   r'(?:राज्य|प्रदेश)\s*[:/\-]?\s*([\u0900-\u097F][\u0900-\u097F\s]{1,20})'),
    ]

    for key, pat in patterns_hi:
        m = re.search(pat, full, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if key == 'name_hi':
                parts = val.split()
                fields["first_name_hi"] = parts[0] if parts else val
                if len(parts) > 1:
                    fields["last_name_hi"] = ' '.join(parts[1:])
            elif key in ('father_hi', 'husband_hi'):
                fields["relation_name_hi"] = val
                fields["relation_type"] = 'father' if 'father' in key else 'husband'
            elif key == 'caste_hi':
                fields["caste_hi"] = val
            elif key == 'village_hi':
                fields["village_hi"] = val

    # English patterns
    patterns_en = [
        ('name_en',    r'(?:Name|Naam)\s*[:/\-]\s*([A-Za-z][\w\s]{1,35})'),
        ('father_en',  r'(?:Father|S/?O|F/?O|Son\s*of)\s*[:/\-]?\s*([A-Za-z][\w\s]{1,35})'),
        ('husband_en', r'(?:Husband|H/?O|W/?O)\s*[:/\-]?\s*([A-Za-z][\w\s]{1,35})'),
        ('caste_en',   r'(?:Caste|Cast|Jati)\s*[:/\-]\s*([A-Za-z][\w\s]{1,20})'),
        ('village_en', r'(?:Village|Vill?|Gram|Gaon)\s*[:/\-]\s*([A-Za-z][\w\s]{1,25})'),
    ]

    for key, pat in patterns_en:
        m = re.search(pat, full, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if key == 'name_en':
                parts = val.split()
                fields["first_name"] = parts[0] if parts else val
                if len(parts) > 1:
                    fields["last_name"] = ' '.join(parts[1:])
            elif key in ('father_en', 'husband_en'):
                fields["relation_name"] = val
            elif key == 'caste_en':
                fields["caste"] = val
            elif key == 'village_en':
                fields["village"] = val

    # Fallback: first Devanagari-rich line = name
    if not fields["first_name_hi"]:
        for line in lines[:8]:
            deva = re.sub(r'[^\u0900-\u097F\s]', '', line).strip()
            if len(deva) >= 2:
                parts = deva.split()
                fields["first_name_hi"] = parts[0] if parts else deva
                if len(parts) > 1:
                    fields["last_name_hi"] = ' '.join(parts[1:])
                break

    # Fallback: first English name line
    if not fields["first_name"]:
        for line in lines[:8]:
            en = re.sub(r'[^A-Za-z\s]', '', line).strip()
            if len(en) >= 3:
                parts = en.split()
                if len(parts) >= 2:
                    fields["first_name"] = parts[0]
                    fields["last_name"] = ' '.join(parts[1:])
                    break

    return fields


@router.post("/scan")
async def scan_document(file: UploadFile = File(...)):
    """OCR endpoint — returns raw text + parsed fields. Never returns error to client."""
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        best_text, combined_text = run_ocr_multipass(img)
        fields = parse_fields(combined_text or best_text)

        return JSONResponse({
            "success": True,
            "raw_text": combined_text or best_text or "",
            "fields": fields,
        })

    except Exception as e:
        print(f"OCR scan error: {e}")
        # Never crash — return empty fields with error message
        empty = {
            "first_name": "", "last_name": "", "relation_name": "",
            "relation_type": "father", "caste": "", "village": "",
            "phone": "", "address": "",
            "first_name_hi": "", "last_name_hi": "",
            "relation_name_hi": "", "caste_hi": "", "village_hi": "",
        }
        return JSONResponse({
            "success": False,
            "raw_text": f"Error: {str(e)}",
            "fields": empty,
            "message": "Auto-detect failed. Please fill fields manually below."
        })
