#!/usr/bin/env python3
"""Ink-bottom scan for the steps pill (issue #56 QA).

Finds the count text ink (digits or em dash) and the shoe-print mark ink in a
home screenshot, reports each region's ink-bottom row and the gap.

Method: luminance threshold -> connected components -> group components into
pill-band clusters by horizontal bbox gap -> last cluster = mark, previous
cluster = count text. Ink-bottom = max row containing ink in the group.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

INK_LUM_MAX = 150          # ink #5B4634 lum~74; canvas/card lum >230
MIN_AREA = 25              # drop antialias specks
CLUSTER_GAP = 15           # px gap that separates glyph groups (digit gaps < this)


def scan(path, band_top_frac=0.40):
    img = Image.open(path).convert('RGB')
    a = np.asarray(img).astype(np.float32)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    mask = lum < INK_LUM_MAX
    lab, n = ndimage.label(mask)
    H, W = mask.shape
    objs = ndimage.find_objects(lab)
    comps = []
    for i, sl in enumerate(objs):
        ys, xs = sl
        area = int((lab[sl] == i + 1).sum())
        if area < MIN_AREA:
            continue
        comps.append({'x1': xs.start, 'x2': xs.stop, 'y1': ys.start,
                      'y2': ys.stop, 'area': area})
    # pill band: components in the lower part of the screen, below the mascot
    band = [c for c in comps if c['y1'] >= H * band_top_frac]
    if not band:
        raise SystemExit(f'no ink components below y={H*band_top_frac:.0f}')
    # group by horizontal bbox gap
    band.sort(key=lambda c: c['x1'])
    groups = []
    for c in band:
        if groups and c['x1'] - groups[-1]['x2max'] < CLUSTER_GAP:
            g = groups[-1]
            g['comps'].append(c)
            g['x2max'] = max(g['x2max'], c['x2'])
        else:
            groups.append({'comps': [c], 'x2max': c['x2']})
    if len(groups) < 2:
        raise SystemExit(f'expected >=2 glyph groups, got {len(groups)}: '
                         + str([(g["comps"][0]["x1"], g["x2max"]) for g in groups]))
    text_g, mark_g = groups[-2], groups[-1]
    text_bottom = max(c['y2'] for c in text_g['comps'])
    mark_bottom = max(c['y2'] for c in mark_g['comps'])
    gap_px = mark_bottom - text_bottom
    print(f'image={path}  {W}x{H}')
    print(f'  text group: comps={len(text_g["comps"])} '
          f'bbox=x[{text_g["comps"][0]["x1"]}..{text_g["x2max"]}] '
          f'ink_bottom(y2max)={text_bottom}')
    print(f'  mark group: comps={len(mark_g["comps"])} '
          f'bbox=x[{mark_g["comps"][0]["x1"]}..{mark_g["x2max"]}] '
          f'ink_bottom(y2max)={mark_bottom}')
    print(f'  gap = mark_bottom - text_bottom = {gap_px} px '
          f'(mark {"below" if gap_px > 0 else "above" if gap_px < 0 else "level with"} text ink)')
    return gap_px


if __name__ == '__main__':
    for p in sys.argv[1:]:
        scan(p)
        print()
