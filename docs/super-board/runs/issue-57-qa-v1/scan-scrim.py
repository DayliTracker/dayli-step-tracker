#!/usr/bin/env python3
"""Scrim scan for the stepper popup (issue #57 QA).

Per image:
  1. Scrim top scan — the page bg is cream #FAF3E6 (250,243,230); under the
     rgba(0,0,0,.28) scrim it renders ~ (180,175,166). Rows 0..250px are
     classified by majority: the length of the cream run starting at y=0 is
     the cream strip the issue reports (before: ~186px = 62pt; after: 0).
  2. Card bbox — the popup card bg is rgba(250,243,230,0.98) ≈ the cream
     token, a large centered component bounded by dimmed pixels. Reported in
     px and pt so before/after position can be compared.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

CREAM = np.array([250, 243, 230], dtype=np.float32)
DIM = np.array([180, 175, 166], dtype=np.float32)
TOL = 14.0
SCAN_ROWS = 250          # px — covers the 62pt (186px) safe-area inset + margin
SCALE = 3.0              # iPhone 18 Pro @3x


def classify_rows(a):
    h, w, _ = a.shape
    d_cream = np.abs(a - CREAM).max(axis=2)
    d_dim = np.abs(a - DIM).max(axis=2)
    cream = d_cream <= TOL
    dim = d_dim <= TOL
    top = a[:SCAN_ROWS]
    rows = []
    for y in range(min(SCAN_ROWS, h)):
        cf = cream[y].mean()
        df = dim[y].mean()
        rows.append((y, cf, df))
    return rows, cream


def cream_run_at_top(rows):
    run = 0
    for y, cf, df in rows:
        if cf >= 0.40:
            run = y + 1
        else:
            break
    return run


def card_bbox(cream_mask):
    lab, n = ndimage.label(cream_mask)
    objs = ndimage.find_objects(lab)
    cands = []
    for i, sl in enumerate(objs):
        ys, xs = sl
        area = int((lab[sl] == i + 1).sum())
        if area < 200_000:   # the card is ~900 x ~700px; text glyphs are tiny
            continue
        cands.append({'y1': ys.start, 'y2': ys.stop, 'x1': xs.start,
                      'x2': xs.stop, 'area': area, 'touches_top': ys.start == 0})
    return cands


def scan(path):
    img = Image.open(path).convert('RGB')
    a = np.asarray(img).astype(np.float32)
    h, w, _ = a.shape
    rows, cream = classify_rows(a)
    run = cream_run_at_top(rows)
    comps = [c for c in card_bbox(cream) if not c['touches_top']]
    print(f'== {path}  {w}x{h}')
    print(f'   cream run at top: {run}px = {run/SCALE:.1f}pt'
          + ('  <-- hard cream edge at the safe-area top' if run > 4 else '  (no cream strip; scrim reaches y=0)'))
    for y, cf, df in rows[:0] or []:
        pass
    # print the transition rows around the run end for the record
    for y in range(max(0, run - 2), min(len(rows), run + 3)):
        print(f'   row y={y}px ({y/SCALE:5.1f}pt)  cream={rows[y][1]:.2f} dim={rows[y][2]:.2f}')
    if not comps:
        print('   card bbox: NONE (no large cream component off the top strip)')
    else:
        c = max(comps, key=lambda c: c['area'])
        print(f"   card bbox: x[{c['x1']}..{c['x2']}] y[{c['y1']}..{c['y2']}] px"
              f"  = x[{c['x1']/SCALE:.1f}..{c['x2']/SCALE:.1f}] y[{c['y1']/SCALE:.1f}..{c['y2']/SCALE:.1f}] pt"
              f"  area={c['area']} comps_offtop={len(comps)}")
        return (c['x1'], c['y1'], c['x2'], c['y2'])
    return None


if __name__ == '__main__':
    boxes = [scan(p) for p in sys.argv[1:]]
    boxes = [b for b in boxes if b]
    if len(boxes) >= 2:
        b0, b1 = boxes[0], boxes[1]
        delta = [abs(x - y) for x, y in zip(b0, b1)]
        print('card-position delta (before vs after), px:', delta,
              '-> pt:', [round(d / SCALE, 1) for d in delta])
        print('POSITION UNCHANGED' if max(delta) <= 3 else 'POSITION CHANGED')
