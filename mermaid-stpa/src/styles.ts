const getStyles = (o: Record<string, string | undefined> = {}): string => `
  .stpa-title { fill: ${o.titleColor ?? o.textColor}; font-size: 18px; text-anchor: middle; }
  .stpa-node rect { stroke-width: 1.5px; }
  .stpa-controller rect { fill: ${o.primaryColor}; stroke: ${o.primaryBorderColor}; }
  .stpa-process rect { fill: ${o.secondaryColor}; stroke: ${o.secondaryBorderColor}; }
  .stpa-controller text { fill: ${o.primaryTextColor}; }
  .stpa-process text { fill: ${o.secondaryTextColor ?? o.primaryTextColor}; }
  .stpa-node-name { font-size: 14px; font-weight: 600; text-anchor: middle; }
  .stpa-node-kind { font-size: 11px; opacity: 0.7; text-anchor: middle; }
  .stpa-edge { fill: none; stroke: ${o.lineColor}; stroke-width: 1.8px; }
  .stpa-feedback { stroke-dasharray: 7 5; }
  .stpa-arrow path { fill: ${o.lineColor}; }
  .stpa-edge-label { fill: ${o.textColor}; font-size: 12px; paint-order: stroke; stroke: ${o.background ?? 'transparent'}; stroke-width: 4px; stroke-linejoin: round; }
`;

export default getStyles;
