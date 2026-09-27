import base64
import io
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask


def compute_checksum(code_str: str) -> str:
    """Computes a 1-character alphanumeric checksum to detect manual typos."""
    charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    total = 0
    for i, char in enumerate(code_str.upper()):
        val = charset.find(char)
        if val >= 0:
            total += val * (i + 1)
    return charset[total % len(charset)]


def generate_batch_code(plant: str, product_sku: str, date_str: str, machine_code: str, seq: int) -> str:
    """
    Format: {PLANT}-{PRODUCT}-{YYMMDD}-{MACHINE}-{SEQ}
    e.g. P1-WGT-260927-M04-0032
    """
    clean_sku = product_sku.replace("-", "")[:3].upper()
    seq_str = f"{seq:04d}"
    return f"{plant}-{clean_sku}-{date_str}-{machine_code}-{seq_str}"


def generate_qr_data_url(data: str) -> str:
    """Generates a high-contrast PNG QR code as a Base64 Data URL."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
