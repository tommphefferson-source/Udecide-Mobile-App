"""
UDecide Feature Specification PDF Generator
Uses ReportLab to produce a polished, multi-page PDF spec.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfgen import canvas as pdfcanvas

# ── Colour palette ──────────────────────────────────────────────────────────
NAVY        = colors.HexColor("#0D1B2A")
NAVY_LIGHT  = colors.HexColor("#1B2D45")
RED         = colors.HexColor("#C41E3A")
GOLD        = colors.HexColor("#D4AF37")
WHITE       = colors.HexColor("#FFFFFF")
LIGHT_BG    = colors.HexColor("#F7F9FC")
BORDER      = colors.HexColor("#E2E8F0")
TEXT_DARK   = colors.HexColor("#1A2533")
TEXT_MID    = colors.HexColor("#2D3748")
TEXT_LIGHT  = colors.HexColor("#4A5568")
TEXT_MUTED  = colors.HexColor("#8899AA")
BLUE_BG     = colors.HexColor("#EBF4FF")
BLUE_BORDER = colors.HexColor("#BEE3F8")
BLUE_TEXT   = colors.HexColor("#2C5282")
WARN_BG     = colors.HexColor("#FFFBEB")
WARN_BORDER = colors.HexColor("#F6AD55")
WARN_TEXT   = colors.HexColor("#744210")
OK_BG       = colors.HexColor("#F0FFF4")
OK_BORDER   = colors.HexColor("#9AE6B4")
OK_TEXT     = colors.HexColor("#22543D")

W, H = A4  # 595.28 x 841.89 pt

# ── Page template ────────────────────────────────────────────────────────────
class PageTemplate:
    def __init__(self):
        self.page_num = 0

    def __call__(self, canv, doc):
        canv.saveState()
        self.page_num += 1
        p = self.page_num

        # Skip footer on cover (page 1)
        if p > 1:
            canv.setFillColor(TEXT_MUTED)
            canv.setFont("Helvetica", 7)
            canv.drawCentredString(
                W / 2, 1.2 * cm,
                f"UDecide Feature Specification  •  Page {p}"
            )
            # thin top rule
            canv.setStrokeColor(BORDER)
            canv.setLineWidth(0.5)
            canv.line(2.4 * cm, H - 1.4 * cm, W - 2.4 * cm, H - 1.4 * cm)

        canv.restoreState()

# ── Custom flowables ─────────────────────────────────────────────────────────
class SectionHeader(Flowable):
    """Full-width navy banner for section headers."""
    def __init__(self, number, title, tagline, width):
        super().__init__()
        self.number  = number
        self.title   = title
        self.tagline = tagline
        self.width   = width
        self.height  = 72

    def draw(self):
        c = self.canv
        c.saveState()
        # Background
        c.setFillColor(NAVY)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=0)
        # Red section number tag
        c.setFillColor(RED)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(14, self.height - 18, self.number.upper())
        # Title
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 20)
        c.drawString(14, self.height - 42, self.title)
        # Tagline
        c.setFillColor(colors.HexColor("#AABBCC"))
        c.setFont("Helvetica", 9)
        c.drawString(14, self.height - 58, self.tagline)
        c.restoreState()

    def wrap(self, availW, availH):
        self.width = availW
        return availW, self.height


class CoverPage(Flowable):
    def __init__(self, width, height):
        super().__init__()
        self.width  = width
        self.height = height

    def draw(self):
        c = self.canv
        c.saveState()
        w, h = self.width, self.height

        # Background
        c.setFillColor(NAVY)
        c.roundRect(0, 0, w, h, 10, fill=1, stroke=0)

        # Subtle grid lines
        c.setStrokeColor(colors.HexColor("#1B2D45"))
        c.setLineWidth(0.4)
        for x in range(0, int(w) + 1, 40):
            c.line(x, 0, x, h)
        for y in range(0, int(h) + 1, 40):
            c.line(0, y, w, y)

        # Icon circle (red square with rounded corners + star)
        cx, cy = w / 2, h / 2 + 100
        c.setFillColor(RED)
        c.roundRect(cx - 30, cy - 30, 60, 60, 12, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(cx, cy - 10, "★")

        # Tag pill
        pill_y = cy - 60
        pill_w, pill_h = 200, 22
        pill_x = cx - pill_w / 2
        c.setFillColor(colors.HexColor("#2A0F18"))
        c.roundRect(pill_x, pill_y - 4, pill_w, pill_h, 11, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#8B1A2F"))
        c.setLineWidth(0.8)
        c.roundRect(pill_x, pill_y - 4, pill_w, pill_h, 11, fill=0, stroke=1)
        c.setFillColor(colors.HexColor("#FF7090"))
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(cx, pill_y + 4, "NONPARTISAN VOTER INFORMATION APP")

        # App name
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 48)
        c.drawCentredString(cx, cy - 110, "UDecide")

        # Subtitle
        c.setFillColor(colors.HexColor("#8899AA"))
        c.setFont("Helvetica", 14)
        c.drawCentredString(cx, cy - 132, "Complete Feature Specification")

        # Divider
        c.setStrokeColor(RED)
        c.setLineWidth(3)
        c.line(cx - 30, cy - 150, cx + 30, cy - 150)

        # Meta
        c.setFillColor(colors.HexColor("#556677"))
        c.setFont("Helvetica", 8.5)
        c.drawCentredString(cx, cy - 172, "User Guide & Feature Reference  •  May 2026")

        c.restoreState()

    def wrap(self, availW, availH):
        return self.width, self.height


class InfoBox(Flowable):
    """Coloured info / warning / success box."""
    STYLES = {
        "info":    (BLUE_BG,  BLUE_BORDER,  BLUE_TEXT,  "ℹ  "),
        "warning": (WARN_BG,  WARN_BORDER,  WARN_TEXT,  "⚠  "),
        "success": (OK_BG,    OK_BORDER,    OK_TEXT,    "✓  "),
    }

    def __init__(self, title, body, kind="info", width=400):
        super().__init__()
        self.title = title
        self.body  = body
        self.kind  = kind
        self.width = width
        self.height = None

    def _compute_height(self):
        from reportlab.pdfbase.pdfmetrics import stringWidth
        lines = self._wrap_text(self.body, self.width - 28, "Helvetica", 8.5)
        return 14 + 14 + len(lines) * 12 + 10

    def _wrap_text(self, text, max_width, font, size):
        from reportlab.pdfbase.pdfmetrics import stringWidth
        words = text.split()
        lines, line = [], ""
        for word in words:
            test = (line + " " + word).strip()
            if stringWidth(test, font, size) <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
        return lines

    def draw(self):
        bg, border, text_col, icon = self.STYLES[self.kind]
        c = self.canv
        c.saveState()

        h = self._compute_height()
        c.setFillColor(bg)
        c.setStrokeColor(border)
        c.setLineWidth(1)
        c.roundRect(0, 0, self.width, h, 5, fill=1, stroke=1)

        # Left accent bar
        c.setFillColor(border)
        c.roundRect(0, 0, 4, h, 3, fill=1, stroke=0)

        # Title
        c.setFillColor(text_col)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(12, h - 14, self.title)

        # Body
        c.setFont("Helvetica", 8.5)
        lines = self._wrap_text(self.body, self.width - 28, "Helvetica", 8.5)
        y = h - 28
        for line in lines:
            c.drawString(12, y, line)
            y -= 12

        c.restoreState()

    def wrap(self, availW, availH):
        self.width = availW
        h = self._compute_height()
        return availW, h


# ── Paragraph styles ─────────────────────────────────────────────────────────
def styles():
    base = dict(fontName="Helvetica", fontSize=10.5, leading=16,
                textColor=TEXT_MID, spaceAfter=6)

    def ps(name, **kw):
        d = dict(base)
        d.update(kw)
        return ParagraphStyle(name, **d)

    return {
        "body":        ps("body"),
        "h2":          ps("h2",  fontName="Helvetica-Bold", fontSize=13,
                          textColor=NAVY, spaceBefore=18, spaceAfter=8, leading=18),
        "h3":          ps("h3",  fontName="Helvetica-Bold", fontSize=11,
                          textColor=NAVY_LIGHT, spaceBefore=12, spaceAfter=6, leading=15),
        "toc_main":    ps("toc_main", fontName="Helvetica-Bold", fontSize=11,
                          textColor=NAVY, spaceAfter=2),
        "toc_sub":     ps("toc_sub",  fontSize=10, textColor=TEXT_LIGHT,
                          spaceAfter=1, leftIndent=16),
        "step_num":    ps("step_num", fontName="Helvetica-Bold", fontSize=9,
                          textColor=WHITE, alignment=TA_CENTER),
        "bullet":      ps("bullet", leftIndent=16, spaceAfter=4),
        "caption":     ps("caption", fontSize=8.5, textColor=TEXT_MUTED,
                          alignment=TA_CENTER),
        "section_label": ps("sl", fontName="Helvetica-Bold", fontSize=7.5,
                             textColor=RED, spaceAfter=4, letterSpacing=1.5),
        "footer":      ps("footer", fontSize=8, textColor=TEXT_MUTED,
                          alignment=TA_CENTER),
        "cover_body":  ps("cb", fontSize=10, textColor=TEXT_MID,
                          alignment=TA_CENTER),
    }

S = styles()

# ── Helper builders ───────────────────────────────────────────────────────────
def h2(text):   return Paragraph(text, S["h2"])
def h3(text):   return Paragraph(text, S["h3"])
def body(text): return Paragraph(text, S["body"])
def sp(n=8):    return Spacer(1, n)
def hr():       return HRFlowable(width="100%", thickness=0.5,
                                  color=BORDER, spaceAfter=8, spaceBefore=8)

def feature_card(title, text):
    """Left-red-bordered card."""
    data = [[
        Table(
            [[Paragraph(f"<b>{title}</b>", ParagraphStyle(
                "fct", fontName="Helvetica-Bold", fontSize=11,
                textColor=NAVY, spaceAfter=4)),
              Paragraph(text, ParagraphStyle(
                "fcb", fontName="Helvetica", fontSize=9.5,
                textColor=TEXT_LIGHT, leading=14))]],
            colWidths=["100%"],
            style=TableStyle([("LEFTPADDING",  (0,0), (-1,-1), 0),
                               ("RIGHTPADDING", (0,0), (-1,-1), 0),
                               ("TOPPADDING",   (0,0), (-1,-1), 0),
                               ("BOTTOMPADDING",(0,0), (-1,-1), 0)])
        )
    ]]
    t = Table(data, colWidths=["100%"])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), LIGHT_BG),
        ("BOX",           (0,0), (-1,-1), 0.75, BORDER),
        ("LINEBEFORE",    (0,0), (0,-1),  3.5,  RED),
        ("LEFTPADDING",   (0,0), (-1,-1), 14),
        ("RIGHTPADDING",  (0,0), (-1,-1), 14),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [LIGHT_BG]),
    ]))
    return KeepTogether([t, sp(10)])


def two_col_cards(pairs):
    """2-column mini-cards. pairs = [(title, text), ...]"""
    rows = []
    for i in range(0, len(pairs), 2):
        row = []
        for title, text in pairs[i:i+2]:
            inner = Table(
                [[Paragraph(f"<b>{title}</b>", ParagraphStyle(
                    "mc_t", fontName="Helvetica-Bold", fontSize=10,
                    textColor=NAVY, spaceAfter=3)),
                  Paragraph(text, ParagraphStyle(
                    "mc_b", fontName="Helvetica", fontSize=9,
                    textColor=TEXT_LIGHT, leading=13))]],
                colWidths=["100%"],
                style=TableStyle([("LEFTPADDING",  (0,0), (-1,-1), 0),
                                   ("RIGHTPADDING", (0,0), (-1,-1), 0),
                                   ("TOPPADDING",   (0,0), (-1,-1), 0),
                                   ("BOTTOMPADDING",(0,0), (-1,-1), 0)])
            )
            cell = Table([[inner]], colWidths=["100%"])
            cell.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), LIGHT_BG),
                ("BOX",           (0,0), (-1,-1), 0.75, BORDER),
                ("LEFTPADDING",   (0,0), (-1,-1), 12),
                ("RIGHTPADDING",  (0,0), (-1,-1), 12),
                ("TOPPADDING",    (0,0), (-1,-1), 10),
                ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ]))
            row.append(cell)
        if len(row) == 1:
            row.append("")
        rows.append(row)

    col_w = (W - 4.8 * cm) / 2
    t = Table(rows, colWidths=[col_w - 6, col_w - 6])
    t.setStyle(TableStyle([
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("COLPADDING",    (0,0), (-1,-1), 6),
    ]))
    return KeepTogether([t, sp(10)])


def steps_table(items):
    """Numbered step list."""
    rows = []
    for i, text in enumerate(items, 1):
        num_cell = Table(
            [[Paragraph(str(i), ParagraphStyle(
                "sn", fontName="Helvetica-Bold", fontSize=8.5,
                textColor=WHITE, alignment=TA_CENTER))]],
            colWidths=[18], rowHeights=[18]
        )
        num_cell.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), RED),
            ("ROUNDEDCORNERS",(0,0), (-1,-1), [9,9,9,9]),
            ("LEFTPADDING",   (0,0), (-1,-1), 0),
            ("RIGHTPADDING",  (0,0), (-1,-1), 0),
            ("TOPPADDING",    (0,0), (-1,-1), 2),
            ("BOTTOMPADDING", (0,0), (-1,-1), 0),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]))
        text_para = Paragraph(text, ParagraphStyle(
            "st", fontName="Helvetica", fontSize=9.5,
            textColor=TEXT_MID, leading=14))
        rows.append([num_cell, text_para])

    content_w = W - 4.8 * cm
    t = Table(rows, colWidths=[28, content_w - 28])
    t.setStyle(TableStyle([
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("LINEBELOW",     (0,0), (-1,-2), 0.5, BORDER),
    ]))
    return KeepTogether([t, sp(10)])


def bullets_list(items):
    """Arrow-bulleted list."""
    rows = []
    for text in items:
        arrow = Paragraph("▸", ParagraphStyle(
            "arr", fontName="Helvetica-Bold", fontSize=9,
            textColor=RED, alignment=TA_CENTER))
        para = Paragraph(text, ParagraphStyle(
            "bl", fontName="Helvetica", fontSize=9.5,
            textColor=TEXT_MID, leading=14))
        rows.append([arrow, para])

    content_w = W - 4.8 * cm
    t = Table(rows, colWidths=[16, content_w - 16])
    t.setStyle(TableStyle([
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("LINEBELOW",     (0,0), (-1,-2), 0.5, LIGHT_BG),
    ]))
    return KeepTogether([t, sp(10)])


def toc_row(label, page, indent=False):
    left_style = ParagraphStyle(
        "tl", fontName="Helvetica-Bold" if not indent else "Helvetica",
        fontSize=11 if not indent else 10,
        textColor=NAVY if not indent else TEXT_LIGHT,
        leftIndent=20 if indent else 0)
    right_style = ParagraphStyle(
        "tr", fontName="Helvetica", fontSize=9.5, textColor=TEXT_MUTED,
        alignment=TA_RIGHT)
    row = [[Paragraph(label, left_style), Paragraph(str(page), right_style)]]
    content_w = W - 4.8 * cm
    t = Table(row, colWidths=[content_w - 30, 30])
    t.setStyle(TableStyle([
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LINEBELOW",     (0,0), (-1,-1), 0.5, BORDER),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    return t


# ═══════════════════════════════════════════════════════════════════════════
#  BUILD DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════
def build():
    story = []
    content_w = W - 4.8 * cm   # usable text width

    template = PageTemplate()

    doc = SimpleDocTemplate(
        "scripts/udecide_spec.pdf",
        pagesize=A4,
        leftMargin=2.4 * cm, rightMargin=2.4 * cm,
        topMargin=2.0 * cm,  bottomMargin=2.2 * cm,
        onPage=template,
    )

    # ── COVER ────────────────────────────────────────────────────────────────
    # Frame height = H - topMargin - bottomMargin = ~710pt; use 690 for safe fit
    cover_h = H - doc.topMargin - doc.bottomMargin - 12
    story.append(CoverPage(content_w, cover_h))
    story.append(PageBreak())

    # ── TABLE OF CONTENTS ─────────────────────────────────────────────────
    story.append(Paragraph(
        "Table of Contents",
        ParagraphStyle("toc_hdr", fontName="Helvetica-Bold", fontSize=20,
                       textColor=NAVY, spaceAfter=4)))
    story.append(HRFlowable(width="100%", thickness=3, color=RED,
                             spaceAfter=14, spaceBefore=4))

    toc_entries = [
        ("Introduction & Getting Started", 3, False),
        ("Creating an Account",            3, True),
        ("Setting Your Location",          3, True),
        ("01  Dashboard",                  4, False),
        ("02  Representatives",            5, False),
        ("03  Elections & Ballots",        6, False),
        ("04  Legislation Tracker",        7, False),
        ("05  Voter Status Tools",         8, False),
        ("06  Political Parties",          9, False),
        ("07  Political System Guide",    10, False),
        ("08  Political Polls",           11, False),
        ("09  AI Fact Checker",           12, False),
        ("10  Address Override",          13, False),
        ("11  Profile & Settings",        14, False),
        ("Appendix: Navigation & Design", 15, False),
    ]
    for label, pg, indent in toc_entries:
        story.append(toc_row(label, pg, indent))

    story.append(PageBreak())

    # ── INTRODUCTION ────────────────────────────────────────────────────────
    story.append(Paragraph("OVERVIEW", S["section_label"]))
    story.append(Paragraph("Introduction & Getting Started",
        ParagraphStyle("intro_h", fontName="Helvetica-Bold", fontSize=20,
                       textColor=NAVY, spaceAfter=12)))

    story.append(body(
        "UDecide is a free, nonpartisan mobile app that puts all the political and civic "
        "information you need in one place. Whether you want to find your representatives, "
        "track upcoming elections, follow legislation, or fact-check a political claim, "
        "UDecide gives you reliable, unbiased information sourced from official government "
        "databases."
    ))
    story.append(body(
        "This document describes every feature in UDecide from a user's point of view — "
        "what each screen does, how to use it, and what to expect."
    ))
    story.append(sp(4))
    story.append(InfoBox(
        "Nonpartisan Promise",
        "UDecide presents information from official sources without ranking, endorsing, or "
        "favoring any political party, candidate, or ideology. All perspectives are given "
        "equal treatment.",
        kind="success"
    ))
    story.append(sp(6))

    story.append(h2("Creating an Account"))
    story.append(steps_table([
        "<b>Open the app</b> — you will land on the Sign In screen with a deep-navy background.",
        "<b>Tap \"Create Account\"</b> to open the registration form. Enter your first name, "
        "last name, email address, and a password (minimum 8 characters, at least one number).",
        "<b>Set up your profile</b> — after registering you are taken to the Profile Setup "
        "screen where you enter your U.S. address (street, city, state, ZIP). This address "
        "is used to find your local representatives and elections.",
        "<b>Tap \"Continue\"</b> to arrive at your personalised Dashboard.",
    ]))

    story.append(h2("Setting Your Location"))
    story.append(body(
        "UDecide uses your address to show you the right representatives, elections, and "
        "local legislation. You set this when you register and can update it in your Profile. "
        "You can also temporarily switch to any other U.S. address using the "
        "<b>Address Override</b> feature (see Feature 10) without permanently changing "
        "your account address."
    ))
    story.append(sp(6))
    story.append(two_col_cards([
        ("Returning Users",
         "Enter your email and password on the Sign In screen. Tap \"Forgot Password?\" "
         "if you need to reset it."),
        ("Password Reset",
         "Enter your registered email address and follow the on-screen instructions "
         "to create a new password."),
    ]))

    story.append(PageBreak())

    # ── SECTION 1: DASHBOARD ─────────────────────────────────────────────
    story.append(SectionHeader("Feature 01", "Dashboard",
                               "Your personalised civic home screen", content_w))
    story.append(sp(12))
    story.append(body(
        "The Dashboard is the first screen you see after signing in. It greets you by name "
        "and shows your current city and state so you know the app is tuned to your location. "
        "Below the greeting is a scrollable grid of cards — one for each major feature."
    ))
    story.append(h2("What You'll See"))
    story.append(bullets_list([
        "<b>Welcome header</b> — your first name and location chip (e.g., \"Austin, TX\") "
        "displayed prominently at the top.",
        "<b>Quick-access cards</b> — large, tappable tiles for each feature: Representatives, "
        "Elections, Legislation, Voter Tools, Political Parties, Political System Guide, "
        "Polls, and Fact Checker.",
        "<b>Each card shows</b> an icon, a title, and a short description of that feature.",
    ]))
    story.append(h2("How to Use It"))
    story.append(steps_table([
        "Scroll down to browse all available features.",
        "Tap any card to go directly to that feature.",
        "Use the tab bar at the bottom to jump between the five main sections at any time.",
    ]))
    story.append(InfoBox(
        "Tip",
        "The Dashboard is always accessible by tapping the home tab (house icon) "
        "at the bottom of the screen.",
        kind="info"
    ))

    story.append(PageBreak())

    # ── SECTION 2: REPRESENTATIVES ────────────────────────────────────────
    story.append(SectionHeader("Feature 02", "Representatives",
        "Find every official who represents you — from Congress to city hall", content_w))
    story.append(sp(12))
    story.append(body(
        "The Representatives screen shows every elected official who serves your address, "
        "organised by level of government. You can expand any card to see detailed "
        "information and contact details."
    ))
    story.append(h2("Government Levels"))
    story.append(two_col_cards([
        ("Federal", "Your two U.S. Senators and one U.S. House Representative for "
                    "your congressional district."),
        ("State",   "Your state governor, state senator, and state house representative."),
        ("County",  "Your county commissioner or equivalent county-level official."),
        ("City",    "Your mayor and city council member for your district."),
    ]))
    story.append(h2("What Each Card Shows"))
    story.append(bullets_list([
        "<b>Name, title, and party</b> — colour-coded party badge (blue for Democrat, "
        "red for Republican, yellow for Independent, etc.).",
        "<b>State and district</b> — the geographic area they represent.",
        "<b>Years in office</b> — how long they have served in their current role.",
        "<b>Voting record summary</b> — a short description of their recent legislative activity.",
        "<b>Contact information</b> — office phone number and official website "
        "(tap to open in your browser).",
    ]))
    story.append(h2("Using the Representatives Screen"))
    story.append(steps_table([
        "Scroll through the list — representatives are grouped by level (Federal, State, "
        "County, City) with a coloured header for each group.",
        "Tap a card to expand it and reveal full contact details and voting record.",
        "Tap the phone number or website link inside an expanded card to contact "
        "your representative.",
    ]))
    story.append(InfoBox(
        "Data Source",
        "Representative data is sourced from official government records and updated "
        "regularly. When an internet connection is unavailable, the app shows the most "
        "recently cached data.",
        kind="info"
    ))

    story.append(PageBreak())

    # ── SECTION 3: ELECTIONS ──────────────────────────────────────────────
    story.append(SectionHeader("Feature 03", "Elections & Ballots",
        "Never miss an election — dates, candidates, and deadlines in one place", content_w))
    story.append(sp(12))
    story.append(body(
        "The Elections screen lists every upcoming election relevant to your address: "
        "presidential, congressional, state, and local. Each election card shows the "
        "full timeline of important dates and lets you explore the candidates running "
        "for each office."
    ))
    story.append(h2("What Each Election Card Shows"))
    story.append(bullets_list([
        "<b>Election name and type</b> — e.g., \"General Election\", \"Primary Election\", "
        "\"Local Runoff\".",
        "<b>Election date</b> — prominently displayed with a countdown or a \"Today\" indicator.",
        "<b>Registration deadline</b> — the last day to register to vote for this election.",
        "<b>Early voting window</b> — the start and end dates for in-person early voting.",
        "<b>Absentee / mail-in ballot deadline</b> — the last day to request or return "
        "an absentee ballot.",
        "<b>Ballot status tags</b> — colour-coded labels such as \"Upcoming\", "
        "\"Early Voting Open\", \"Registration Open\", or \"Closed\".",
    ]))
    story.append(h2("Viewing Candidates"))
    story.append(steps_table([
        "Tap an election card to expand it and see a list of contested offices "
        "(e.g., U.S. Senate, Governor, State House District 42).",
        "Tap an office name to see all candidates running for that position.",
        "Each candidate card shows their name, party, and a brief background note.",
    ]))
    story.append(InfoBox(
        "Important",
        "UDecide does not endorse any candidate. Candidates are listed in alphabetical "
        "order with equal prominence regardless of party affiliation.",
        kind="warning"
    ))
    story.append(h2("Staying on Top of Deadlines"))
    story.append(body(
        "All key dates are shown for every election. If a deadline is approaching within "
        "seven days, it is highlighted in amber so it catches your eye. Check back "
        "regularly as dates can be updated by election authorities."
    ))

    story.append(PageBreak())

    # ── SECTION 4: LEGISLATION ────────────────────────────────────────────
    story.append(SectionHeader("Feature 04", "Legislation Tracker",
        "Follow bills in Congress and your state legislature", content_w))
    story.append(sp(12))
    story.append(body(
        "The Legislation Tracker lets you browse and search bills at both the federal "
        "and state level. Each bill entry shows its current status, a plain-English "
        "summary, and its journey through the legislative process."
    ))
    story.append(h2("Browsing Bills"))
    story.append(bullets_list([
        "<b>Filter tabs</b> — switch between \"Federal\" and \"State\" to focus on "
        "the level of government you care about.",
        "<b>Bill card</b> — shows the bill number (e.g., HB 1234), a short title, "
        "the current status badge, and the date of the most recent action.",
        "<b>Status badges</b> — colour-coded indicators: Introduced (grey), In Committee "
        "(blue), Passed Chamber (amber), Enrolled (green), Signed into Law (dark green), "
        "Vetoed (red), Failed (light red).",
    ]))
    story.append(h2("Bill Detail View"))
    story.append(body("Tap any bill card to open the full detail view:"))
    story.append(bullets_list([
        "<b>Plain-English summary</b> — a concise explanation of what the bill does.",
        "<b>Sponsor and co-sponsors</b> — the legislator(s) who introduced the bill.",
        "<b>Chamber of origin</b> — whether the bill started in the House or Senate.",
        "<b>Legislative timeline</b> — a chronological list of every action taken on "
        "the bill (introduced, committee assignment, votes, presidential action).",
        "<b>Vote record</b> — the most recent roll call vote showing the Yea/Nay breakdown.",
        "<b>Full text link</b> — a link to the official bill text on congress.gov or "
        "your state legislature's website.",
    ]))
    story.append(InfoBox(
        "Data Sources",
        "Federal bills are sourced from Congress.gov. State bills are sourced from "
        "LegiScan, which covers all 50 state legislatures. Both services require an "
        "internet connection; cached data is shown when offline.",
        kind="info"
    ))
    story.append(h2("Searching Legislation"))
    story.append(steps_table([
        "Tap the search icon (magnifying glass) at the top of the Legislation screen.",
        "Type a keyword, bill number, or topic (e.g., \"healthcare\", \"HB 452\", \"tax\").",
        "Results update in real time as you type. Tap a result to open the bill detail.",
    ]))

    story.append(PageBreak())

    # ── SECTION 5: VOTER TOOLS ────────────────────────────────────────────
    story.append(SectionHeader("Feature 05", "Voter Status Tools",
        "Everything you need to know before you vote", content_w))
    story.append(sp(12))
    story.append(body(
        "The Voter Status Tools screen consolidates practical voting information for your "
        "specific state and address. Each card is a self-contained reference for a different "
        "aspect of the voting process."
    ))
    story.append(sp(4))
    story.append(feature_card("Registration Information",
        "Shows your state's voter registration rules: the deadline to register before the "
        "next election, whether your state offers same-day registration, and a direct link "
        "to your state's official registration portal."))
    story.append(feature_card("Polling Place Finder",
        "Displays the name and address of your assigned polling location based on your "
        "registered address. Includes polling place hours for Election Day and a map link "
        "so you can get directions."))
    story.append(feature_card("Early Voting",
        "Shows whether your state offers early in-person voting, the dates of the early "
        "voting period, and the locations of nearby early voting sites."))
    story.append(feature_card("Absentee & Mail-In Voting",
        "Explains your state's rules for voting by mail: whether you need an excuse, "
        "the request deadline, the return deadline, and whether ballot drop boxes are available."))
    story.append(feature_card("Voter ID Requirements",
        "Lists the specific ID documents your state accepts at the polls. Some states "
        "accept a wide range of documents; others have strict photo ID requirements. "
        "This card explains exactly what you need to bring."))
    story.append(InfoBox(
        "State-Specific",
        "All information on this screen is tailored to your state's specific laws, which "
        "vary widely across the country. Always verify critical dates with your local "
        "election authority.",
        kind="success"
    ))

    story.append(PageBreak())

    # ── SECTION 6: PARTIES ────────────────────────────────────────────────
    story.append(SectionHeader("Feature 06", "Political Parties",
        "Understand the major and minor parties — without the spin", content_w))
    story.append(sp(12))
    story.append(body(
        "The Political Parties screen provides neutral, factual profiles of the main "
        "U.S. political parties. Parties are listed alphabetically with no implied "
        "ranking or preference."
    ))
    story.append(h2("Parties Covered"))
    story.append(two_col_cards([
        ("Democratic Party",    "Founded 1828 · Center-left"),
        ("Republican Party",    "Founded 1854 · Center-right"),
        ("Libertarian Party",   "Founded 1971 · Classical liberal"),
        ("Green Party",         "Founded 1984 · Progressive / eco"),
        ("Independent",         "No party affiliation — runs on individual platforms"),
        ("Constitution Party",  "Founded 1992 · Paleoconservative"),
    ]))
    story.append(h2("What Each Party Profile Contains"))
    story.append(bullets_list([
        "<b>Short history</b> — founding year and brief origin story.",
        "<b>Core values</b> — the principles the party states in its platform documents.",
        "<b>Key policy positions</b> — factual summaries of the party's stated stances on "
        "major issues (economy, healthcare, environment, foreign policy, social issues) "
        "drawn directly from official party platforms.",
        "<b>Current leadership</b> — national chair and prominent elected officials.",
        "<b>Electoral performance</b> — recent election results and seats currently held.",
        "<b>Official website link</b> — tap to visit the party's official site for more "
        "information.",
    ]))
    story.append(InfoBox(
        "Editorial Policy",
        "Platform summaries are paraphrased directly from each party's own official "
        "platform documents. UDecide does not add commentary, characterisations, "
        "or comparisons between parties.",
        kind="warning"
    ))

    story.append(PageBreak())

    # ── SECTION 7: POLITICAL GUIDE ────────────────────────────────────────
    story.append(SectionHeader("Feature 07", "Political System Guide",
        "Civic education for every American — easy to understand, easy to share", content_w))
    story.append(sp(12))
    story.append(body(
        "The Political System Guide is an interactive civics reference that explains how "
        "the U.S. government works. It is written for everyone, from first-time voters "
        "to those who want a refresher."
    ))
    story.append(h2("Topics Covered"))
    story.append(feature_card("The Three Branches of Government",
        "Explains the roles of the Legislative (Congress), Executive (President), and "
        "Judicial (Supreme Court and federal courts) branches, and how they are structured."))
    story.append(feature_card("Checks and Balances",
        "Describes how each branch limits the power of the others — for example, how "
        "Congress can override a presidential veto, and how the courts can strike down "
        "laws as unconstitutional."))
    story.append(feature_card("How a Bill Becomes a Law",
        "Step-by-step walkthrough: introduction in either chamber, committee review, "
        "floor debate, vote, conference committee (if needed), presidential action, "
        "and potential veto override."))
    story.append(feature_card("The U.S. Constitution",
        "Summary of the Constitution's structure — the Preamble, the seven original "
        "Articles, and the 27 Amendments — with plain-language explanations."))
    story.append(feature_card("The Bill of Rights",
        "Plain-English explanation of the first ten Amendments: freedom of speech, "
        "right to bear arms, protection from unreasonable searches, right to a fair "
        "trial, and more."))
    story.append(feature_card("The Electoral College",
        "Explains what the Electoral College is, how electors are allocated per state, "
        "how the popular vote and electoral vote interact, and what happens if no "
        "candidate reaches 270 electoral votes."))
    story.append(feature_card("Voting Rights History",
        "Timeline of major milestones: the 15th Amendment (1870), 19th Amendment (1920), "
        "Voting Rights Act (1965), 26th Amendment (1971), and ongoing developments."))
    story.append(body(
        "Each topic is presented as an expandable card. Tap a card header to reveal "
        "the full content. Tap again to collapse it."
    ))

    story.append(PageBreak())

    # ── SECTION 8: POLLS ──────────────────────────────────────────────────
    story.append(SectionHeader("Feature 08", "Political Polls",
        "Have your say on civic topics — see how the community feels", content_w))
    story.append(sp(12))
    story.append(body(
        "The Polls screen hosts a rotating set of community polls on civic and political "
        "topics. All polls are nonpartisan and focus on policy issues, not partisan "
        "preferences."
    ))
    story.append(h2("How Polls Work"))
    story.append(steps_table([
        "Browse the list of active polls. Each card shows the poll question, the number "
        "of votes cast, and — if you've already voted — a live results bar.",
        "Tap a poll card to open it. Read the question and any context provided.",
        "Tap your chosen answer. The results reveal immediately, showing the percentage "
        "breakdown across all options.",
        "Your vote is saved — you cannot vote on the same poll twice.",
    ]))
    story.append(h2("Filtering Polls"))
    story.append(body(
        "Use the topic filter chips at the top of the screen to narrow polls by subject: "
        "<b>All, Economy, Healthcare, Environment, Foreign Policy, Education, Infrastructure</b>."
    ))
    story.append(h2("Results Display"))
    story.append(bullets_list([
        "Animated horizontal bars show the percentage for each answer option.",
        "The total vote count appears below the question.",
        "Your chosen answer is highlighted with a checkmark.",
        "Results update in real time as other users vote.",
    ]))
    story.append(InfoBox(
        "About These Polls",
        "Polls are not scientific surveys. They reflect the opinions of UDecide users "
        "who choose to participate and are not representative of the general population.",
        kind="warning"
    ))

    story.append(PageBreak())

    # ── SECTION 9: FACT CHECKER ───────────────────────────────────────────
    story.append(SectionHeader("Feature 09", "AI Fact Checker",
        "Ask any political question — get a nonpartisan, sourced answer", content_w))
    story.append(sp(12))
    story.append(body(
        "The Fact Checker is a conversational AI assistant powered by Google Gemini. "
        "It is designed to answer political and civic questions, check factual claims, "
        "and explain complex policy topics in plain language — all without political bias."
    ))
    story.append(h2("What You Can Ask"))
    story.append(two_col_cards([
        ("Fact Checking",
         "\"Did Congress pass a budget last year?\" or \"Is it true that the minimum "
         "wage hasn't changed since 2009?\""),
        ("Bill Summaries",
         "\"What does the Inflation Reduction Act actually do?\" or \"Summarise H.R. 1234 "
         "in plain English.\""),
        ("Civics Questions",
         "\"How does the filibuster work?\" or \"What is the difference between a "
         "resolution and a bill?\""),
        ("Policy Context",
         "\"What are the main arguments for and against universal basic income?\" "
         "(presented neutrally with all sides)"),
    ]))
    story.append(h2("Using the Fact Checker"))
    story.append(steps_table([
        "Tap the text input at the bottom of the screen and type your question.",
        "Tap the send button. The AI begins responding immediately — text streams in "
        "word-by-word so you don't have to wait.",
        "Read the response. You can ask follow-up questions to dig deeper into any topic.",
        "Tap the new conversation button (top right) to clear the chat and start fresh.",
    ]))
    story.append(InfoBox(
        "Suggested Questions",
        "If you're not sure what to ask, the screen shows a set of suggested starter "
        "questions. Tap any of them to send it instantly.",
        kind="info"
    ))
    story.append(sp(6))
    story.append(InfoBox(
        "AI Limitations",
        "The AI may occasionally make mistakes or have a knowledge cutoff date for recent "
        "events. Always verify important facts with primary sources such as congress.gov "
        "or your local election authority. The AI will always present multiple perspectives "
        "on contested policy questions and will never express a partisan opinion.",
        kind="warning"
    ))

    story.append(PageBreak())

    # ── SECTION 10: ADDRESS OVERRIDE ──────────────────────────────────────
    story.append(SectionHeader("Feature 10", "Address Override",
        "Explore political data for any U.S. address — without changing your account", content_w))
    story.append(sp(12))
    story.append(body(
        "Address Override lets you temporarily view the app as if you lived somewhere else. "
        "This is useful if you are researching elections in another district, helping a "
        "family member, or simply curious about how the political landscape differs in "
        "another city or state."
    ))
    story.append(h2("How to Use It"))
    story.append(steps_table([
        "Go to the <b>More</b> tab, then tap <b>\"Address Override\"</b>.",
        "Enter any U.S. address in the form fields: street address, city, state, and ZIP code.",
        "Tap <b>\"Apply Override\"</b>. The entire app immediately switches to show data "
        "for that location.",
        "A gold banner appears at the top of every screen to remind you that you are viewing "
        "an overridden address, not your registered location.",
        "To return to your normal address, tap <b>\"Clear Override\"</b> in the banner or "
        "revisit the Address Override screen and tap the clear button.",
    ]))
    story.append(h2("What Changes When Override Is Active"))
    story.append(bullets_list([
        "<b>Representatives</b> — shows officials for the overridden address's district.",
        "<b>Elections</b> — shows elections relevant to the overridden state and district.",
        "<b>Legislation</b> — shows state legislation for the overridden state.",
        "<b>Voter Tools</b> — shows voting rules and deadlines for the overridden state.",
    ]))
    story.append(InfoBox(
        "Your Account is Safe",
        "Address Override is temporary. It does not change your account's registered "
        "address. Your personal address is preserved and restored the moment you clear "
        "the override.",
        kind="success"
    ))

    story.append(PageBreak())

    # ── SECTION 11: PROFILE ───────────────────────────────────────────────
    story.append(SectionHeader("Feature 11", "Profile & Settings",
        "Manage your account and personal information", content_w))
    story.append(sp(12))
    story.append(body(
        "The Profile screen lets you view and update your account information. Access it "
        "by tapping the <b>More</b> tab and then <b>\"My Profile\"</b>, or by tapping "
        "your name at the top of the Dashboard."
    ))
    story.append(h2("What You Can Do"))
    story.append(feature_card("Edit Your Name",
        "Update your first and last name. Your name appears in the Dashboard greeting "
        "and is used to personalise the app experience."))
    story.append(feature_card("Update Your Address",
        "Change your registered address at any time. When you save a new address, all "
        "location-dependent features automatically refresh to reflect the new location."))
    story.append(feature_card("Account Information",
        "View your registered email address. Your email address cannot be changed after "
        "registration — it serves as your permanent login identifier."))
    story.append(feature_card("Sign Out",
        "Sign out of your account. Your data is preserved on the device — signing back in "
        "with the same credentials restores everything. Signing out on a shared device "
        "is recommended to protect your privacy."))

    story.append(h2("The \"More\" Tab"))
    story.append(body(
        "The More tab (last tab in the navigation bar) also provides quick links to "
        "features that don't have their own tab:"
    ))
    story.append(bullets_list([
        "<b>Voter Tools</b> — jump directly to the Voter Status Tools screen.",
        "<b>Political Parties</b> — open the party profiles screen.",
        "<b>Political Guide</b> — open the civics education guide.",
        "<b>Polls</b> — go to the community polls.",
        "<b>Fact Checker</b> — open the AI chatbot.",
        "<b>Address Override</b> — open the location switcher.",
        "<b>My Profile</b> — open the profile/settings screen.",
    ]))

    story.append(PageBreak())

    # ── APPENDIX ─────────────────────────────────────────────────────────
    story.append(SectionHeader("Appendix", "Navigation & App Design",
        "How to get around UDecide", content_w))
    story.append(sp(12))

    story.append(h2("Tab Bar Navigation"))
    story.append(body(
        "The bottom tab bar is always visible and provides instant access to "
        "the five main sections of UDecide:"
    ))
    story.append(two_col_cards([
        ("Home (House icon)",
         "Returns you to the Dashboard from anywhere in the app."),
        ("Representatives (People icon)",
         "Your elected officials at all levels of government."),
        ("Elections (Calendar icon)",
         "Upcoming elections, key dates, and candidates."),
        ("Legislation (Document icon)",
         "Track federal and state bills."),
        ("More (Grid icon)",
         "Voter tools, parties, guide, polls, fact checker, and profile."),
    ]))

    story.append(h2("Design & Accessibility"))
    story.append(bullets_list([
        "<b>Dark navy theme</b> — easy on the eyes in both bright and low-light environments.",
        "<b>Large touch targets</b> — all buttons and cards are sized for easy tapping "
        "on any phone screen size.",
        "<b>High contrast</b> — white text on navy and dark text on light cards both "
        "exceed WCAG AA contrast ratios.",
        "<b>Haptic feedback</b> — tapping important actions produces a subtle vibration "
        "to confirm your input.",
        "<b>Offline support</b> — the app caches data locally so you can browse "
        "representatives, legislation, and guides even without an internet connection.",
    ]))

    story.append(h2("Privacy"))
    story.append(bullets_list([
        "All account data is stored securely on your device using encrypted local storage. "
        "No personal data is sent to external servers beyond the API requests needed "
        "to load content.",
        "The app does not track your usage, sell your data, or show you targeted "
        "advertisements.",
        "API requests to government data sources are anonymised — your personal address "
        "is never included in these requests.",
    ]))

    story.append(sp(20))
    story.append(hr())
    story.append(Paragraph(
        "UDecide  ·  Nonpartisan Political &amp; Voter App  ·  Feature Specification v1.0  ·  May 2026<br/>"
        "Built with Expo / React Native  ·  Data: Congress.gov, LegiScan, Google Gemini AI",
        ParagraphStyle("foot", fontName="Helvetica", fontSize=8,
                       textColor=TEXT_MUTED, alignment=TA_CENTER, leading=14)
    ))

    # ── Build ────────────────────────────────────────────────────────────
    doc.build(story, onFirstPage=template, onLaterPages=template)
    print("PDF generated: scripts/udecide_spec.pdf")


if __name__ == "__main__":
    build()
