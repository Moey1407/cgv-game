"""Create the cast recording booklet from the exported, filename-stable game script."""
import json
import re
from collections import Counter
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Table, TableStyle
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output/pdf/SIGNAL-Dialogue-Recording-Script.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
JOBS = json.loads((ROOT / 'docs/voice-cast/all-lines.json').read_text(encoding='utf-8'))
FONT = Path('C:/Windows/Fonts')
for name, file in [('Body', 'arial.ttf'), ('BodyBold', 'arialbd.ttf'), ('BodyItalic', 'ariali.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT / file)))

INK, MUTED, ACCENT = colors.HexColor('#192c36'), colors.HexColor('#536773'), colors.HexColor('#91713d')
styles = {
    'title': ParagraphStyle('title', fontName='BodyBold', fontSize=34, leading=39, textColor=INK, spaceAfter=16),
    'subtitle': ParagraphStyle('subtitle', fontName='Body', fontSize=17, leading=23, textColor=INK, spaceAfter=18),
    'role': ParagraphStyle('role', fontName='BodyBold', fontSize=25, leading=31, textColor=INK, spaceAfter=10),
    'body': ParagraphStyle('body', fontName='Body', fontSize=10.5, leading=15, textColor=INK, spaceAfter=10),
    'dialogue': ParagraphStyle('dialogue', fontName='Body', fontSize=12, leading=17, textColor=INK, spaceAfter=4),
    'file': ParagraphStyle('file', fontName='Courier-Bold', fontSize=8.7, leading=12, textColor=ACCENT, spaceAfter=4),
    'context': ParagraphStyle('context', fontName='Body', fontSize=8.5, leading=12, textColor=MUTED, spaceAfter=5),
    'direction': ParagraphStyle('direction', fontName='BodyItalic', fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=6),
}

def clean(s):
    return str(s).translate(str.maketrans({'\u2014': '-', '\u2013': '-', '\u2011': '-', '\u202f': ' ', '\u00a0': ' '}))

def para(s, style='body'):
    return Paragraph(escape(clean(s)), styles[style])

notes = {
    'DEX': 'Former handler. Warm and persuasive at the gala; impatient near the safe; cold at the betrayal. Speak quietly to one person over an earpiece. Do not impersonate a real actor.',
    'WREN': 'A capable safecracker. Wry and restrained, then shaken but resourceful. The flashback is breathless; the lens check is confident. Her private thoughts do not sound like a tutorial announcer.',
    'OKAFOR': 'Gala security. Civil but attentive. Questions are conversational; pursuit becomes firm. Keep the person underneath the uniform.',
    'BRIGGS': 'Night security. Tired, listening to small sounds. Investigation is uncertain; pursuit is decisive.',
    'SWEEP TEAM': 'Lockdown response. Short urgent commands across a concrete room. Controlled projection rather than constant screaming.',
    'CONTROL': 'Security dispatcher. Calm, clear and concise over a radio. Record dry; the game adds processing.',
}
counts = Counter(job['who'] for job in JOBS)
story = [para('SIGNAL', 'title'), para('Dialogue recording book', 'subtitle'),
         para(f'15 October 2026 | {len(JOBS)} clips | Six roles', 'context'), Spacer(1, 12),
         para('The heist, in order', 'subtitle'),
         para('Wren joins the museum gala under a hacked guest identity. She links a camera tap, copies Okafor\'s badge and authorises a night visit. At 01:30 she returns, crosses the laser corridor and takes the Kestrel Star. Dex betrays her. Her local rig and Echo help her escape to the roof and zipline away. Three optional evidence files expose Dex.'),
         para('Why the sound rings exist', 'subtitle'),
         para('Wren wears a wrist rig linked to a private acoustic lens. Its passive display visualises sound, even in a brightly lit room. Other people cannot see the coloured rings. The sonar ping makes an audible noise and briefly resolves the floor plan. The security-desk tap unlocks cameras; it does not give Wren her hearing. Dex cutting the radio does not disable the local rig.'),
         para('How to record', 'subtitle'),
         para('Read only the dialogue, not filenames or directions. Save one clean MP3 per entry using the exact filename. Record in a quiet, soft-furnished room with the microphone at a steady distance. Keep natural pauses and emotion; leave a little clean silence at either end. No music, radio filter or reverb. Use your own or another consenting performer\'s voice.'),
         para('Free browser recorder: https://online-voice-recorder.com/ (checked 15 October 2026). Record, trim, save as MP3, then rename it to the filename printed above the line. Keep a backup of your best take.'),
         para('The role sheets contain alternatives and reactive lines: these are separate clips, not one uninterrupted conversation. Missing performances stay captioned. When finished, give the team a folder of named MP3s for the approved-clip importer.')]

for role, note in notes.items():
    story += [PageBreak(), para(role, 'role'), para(f'{counts[role]} clips', 'context'), para(note), Spacer(1, 10)]
    for i, job in enumerate((j for j in JOBS if j['who'] == role), 1):
        level = job.get('level')
        context = str(job.get('key', 'dialogue'))
        if context.startswith('cinematic:'):
            context = {'cinematic:opening': 'Opening flashback / gala setup', 'cinematic:after1': 'Level 1 completed / return after closing', 'cinematic:after2': 'Level 2 completed / betrayal'}.get(context, context)
        context = ('All levels' if level == 'any' else f'Level {level}' if level else 'Story / security') + ' | ' + context
        block = [para(f'{i:02d}  {job["id"]}.mp3', 'file'), para(context, 'context')]
        if job.get('direction'): block.append(para('Direction: ' + job['direction'], 'direction'))
        block += [para(job['text'], 'dialogue'), Spacer(1, 14)]
        story.append(KeepTogether(block))

def page(canvas, doc):
    width, height = A4
    canvas.setStrokeColor(colors.HexColor('#d6dddf')); canvas.line(44, height - 36, width - 44, height - 36)
    canvas.setFont('Body', 8); canvas.setFillColor(MUTED)
    canvas.drawString(44, height - 27, 'SIGNAL / CAST RECORDING SCRIPT')
    canvas.drawString(44, 27, 'Read dialogue only. Save one MP3 per printed filename.')
    canvas.drawRightString(width - 44, 27, str(doc.page))

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=44, leftMargin=44, topMargin=54, bottomMargin=48,
                        title='SIGNAL - Dialogue Recording Script', author='SIGNAL team')
doc.build(story, onFirstPage=page, onLaterPages=page)
reader = PdfReader(str(OUT))
text = '\n'.join(p.extract_text() for p in reader.pages)
missing = [j['id'] for j in JOBS if j['id'] + '.mp3' not in text]
if missing: raise RuntimeError(f'Missing clip filenames: {missing}')
print(f'Created {OUT} | {len(reader.pages)} pages | {len(JOBS)} verified filenames')
