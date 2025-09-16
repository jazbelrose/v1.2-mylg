import React from 'react';
import { getSquirclePath } from '@/shared/ui/squircle/getSquirclePath';

interface SVGThumbnailProps {
  initial: string;
  className?: string;
  roundness?: number; // 0..1
}

const SVGThumbnail: React.FC<SVGThumbnailProps> = ({ initial, className, roundness = 1.0 }) => {
  const w = 236, h = 236;
  const r = Math.min(w, h) * 0.5 * roundness;       // grows to the max
  const k = 0.7 + 0.3 * roundness;                  // nudges toward 1 as it rounds
  const squirclePath = React.useMemo(() => getSquirclePath(w, h, r, k), [w, h, r, k]);

  return (
    <svg className={className} width="250" height="250" viewBox="0 0 250 250">
      <text x={125} y={142} textAnchor="middle" dominantBaseline="middle"
        style={{ fill:'#fff', fontFamily:"HelveticaNeueLT-Roman, 'HelveticaNeue LT 55 Roman', 'Helvetica'", fontSize:'180px' }}>
        {initial}
      </text>
      <path d={squirclePath} transform="translate(7 7)" style={{ fill:'none', stroke:'#fff', strokeMiterlimit:10, strokeWidth:'7px' }} />
    </svg>
  );
};

export default SVGThumbnail;
