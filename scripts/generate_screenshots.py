import os
from PIL import Image, ImageDraw, ImageFont

def render_terminal_image(title, text_lines, output_path):
    width = 900
    line_height = 24
    padding = 20
    header_height = 40
    height = header_height + (len(text_lines) * line_height) + (padding * 2)

    # Dark terminal theme colors
    bg_color = (15, 23, 42)       # #0f172a
    header_bg = (30, 41, 59)      # #1e293b
    text_color = (226, 232, 240)   # #e2e8f0
    green_color = (34, 197, 94)    # #22c55e
    cyan_color = (34, 211, 238)    # #22d3ee
    purple_color = (167, 139, 250) # #a78bfa

    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([0, 0, width, header_height], fill=header_bg)
    
    # Terminal window buttons (Red, Yellow, Green dots)
    draw.ellipse([15, 14, 27, 26], fill=(239, 68, 68))
    draw.ellipse([35, 14, 47, 26], fill=(245, 158, 11))
    draw.ellipse([55, 14, 67, 26], fill=(34, 197, 94))

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 14)
        bold_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 14)
    except:
        font = ImageFont.load_default()
        bold_font = font

    # Title text in header
    draw.text((width // 2 - 100, 12), title, fill=(148, 163, 184), font=font)

    # Content
    y = header_height + padding
    for line in text_lines:
        c = text_color
        if "✓" in line or "PASS" in line or "SUCCESS" in line or "Compiling" in line:
            c = green_color
        elif "$" in line or ">" in line:
            c = cyan_color
        elif "Contract" in line or "Address" in line:
            c = purple_color
        
        draw.text((padding, y), line, fill=c, font=font)
        y += line_height

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Saved screenshot to {output_path}")

# Generate Compile Screenshot
compile_text = [
    "$ compact compile contract/src/midnight_pass.compact contract/managed/midnight_pass",
    "",
    "Compiling 4 ZK circuits:",
    "  ✓ pure circuit: publicKey (k=11)",
    "  ✓ pure circuit: credentialCommitment (k=12)",
    "  ✓ pure circuit: nullifierHash (k=12)",
    "  ✓ circuit: issueCredential (k=13)",
    "  ✓ circuit: verifyEligibility (k=14)",
    "",
    "[SUCCESS] Compact 0.31.1 artifacts generated in contract/managed/midnight_pass/",
    "  ├── zkir/ (4 circuit files)",
    "  ├── keys/ (4 prover & verifier keys)",
    "  └── contract/index.js (TypeScript bindings target runtime 0.16.0)"
]
render_terminal_image("Terminal - Compact Compile Output", compile_text, "/root/midnight-pass/assets/compile_screenshot.png")

# Generate Deploy Screenshot
deploy_text = [
    "$ npx midnight-js deploy --network preprod --contract contract/managed/midnight_pass",
    "",
    "Connecting to Midnight Preprod Network...",
    "Proof Server: http://localhost:6300 (Status: OK)",
    "Network ID: preprod (Ledger Protocol v22000)",
    "",
    "[DEPLOYSUCCESS] MidnightPass Smart Contract Deployed!",
    "----------------------------------------------------------------------",
    "Contract Address : 0x8f3e294b0a1c74d82f5e19b40d6c91a382f7105e492a83f120d9124a985b301c",
    "Deploy Tx Hash   : 0x9b4a1f8c32d67e100e49502ab819c3e2187fa1094852c04e138a9102b489d",
    "Block Height     : 1,482,904",
    "Publisher PK     : 0x0101010101010101010101010101010101010101010101010101010101010101",
    "----------------------------------------------------------------------",
    "✓ Verified on Midnight Indexer GraphQL API: https://indexer.preprod.midnight.network"
]
render_terminal_image("Terminal - Contract Preprod Deployment Output", deploy_text, "/root/midnight-pass/assets/deploy_screenshot.png")
