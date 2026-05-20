/** Mobile (≤1205px) timeline: left rail for dots + vertical line; term and card in the right column. */
export function getTimelineMobileRailCss(scope: string): string {
  const timelineTermHidden = [
    `${scope} .page-web-timeline[data-timeline-show-term="0"]`,
    `${scope} .page-web-timeline[data-timeline-show-term="false" i]`,
    `${scope} .page-web-timeline[data-timeline-show-term="off" i]`,
  ];
  const itemNoTerm = `${scope} .page-web-timeline-item:not(:has(> .page-web-timeline-term))`;
  const itemsSingleRow = [
    ...timelineTermHidden.map((s) => `${s} .page-web-timeline-item`),
    itemNoTerm,
  ].join(",\n");
  const dotsSingleRow = [
    ...timelineTermHidden.map((s) => `${s} .page-web-timeline-dot`),
    `${itemNoTerm} > .page-web-timeline-dot`,
  ].join(",\n");
  const contentSingleRow = [
    ...timelineTermHidden.map((s) => `${s} .page-web-timeline-content`),
    `${itemNoTerm} > .page-web-timeline-content`,
  ].join(",\n");

  return `
${scope} .page-web-timeline { --timeline-rail-width: 1.75rem; }
${scope} .page-web-timeline::before {
  content: "";
  position: absolute;
  left: calc(var(--timeline-rail-width) / 2) !important;
  top: var(--timeline-line-top, 3.1rem) !important;
  height: var(--timeline-line-height, 0px) !important;
  bottom: auto !important;
  right: auto !important;
  width: var(--timeline-line-size) !important;
  transform: translateX(-50%) !important;
  background: #cbd5e1;
  pointer-events: none;
  z-index: 0;
}
${scope} .page-web-timeline-item::before,
${scope} .page-web-timeline-item::after {
  content: none !important;
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
${scope} .page-web-timeline-item {
  display: grid !important;
  grid-template-columns: var(--timeline-rail-width) minmax(0, 1fr) !important;
  grid-template-rows: auto auto;
  column-gap: 0.5rem;
  row-gap: 0.25rem;
  align-items: start;
  padding: 0 !important;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}
${scope} .page-web-timeline-dot {
  grid-column: 1;
  grid-row: 2;
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  justify-self: center;
  align-self: center;
  margin: 0 !important;
  z-index: 3;
  box-shadow: 0 0 0 3px #fff;
}
${scope} .page-web-timeline-term {
  grid-column: 2;
  grid-row: 1;
  position: static !important;
  order: unset !important;
  width: auto !important;
  max-width: none !important;
  white-space: normal !important;
  text-align: left !important;
  justify-content: flex-start !important;
  justify-self: stretch !important;
  align-self: start !important;
  padding: 0 !important;
  overflow: visible;
  margin: 0 !important;
}
${scope} .page-web-timeline-content {
  position: relative;
  z-index: 1;
  grid-column: 2;
  grid-row: 2;
  order: unset !important;
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  justify-self: stretch !important;
  align-self: stretch !important;
  margin: 0 !important;
  text-align: left;
  align-items: stretch !important;
  gap: 0.15rem !important;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.5rem 0.65rem !important;
  box-sizing: border-box;
}
${scope} .page-web-timeline-content > .page-web-elements.page-web-elements-title2,
${scope} .page-web-timeline-content > .page-web-elements.page-web-elements-description.page-web-timeline-text {
  margin: 0 !important;
  padding: 0 !important;
}
${scope} .page-web-timeline-content .page-web-elements-field-row {
  margin: 0 !important;
  padding: 0 !important;
}
${scope} .page-web-timeline-content .page-web-elements-title2-input,
${scope} .page-web-timeline-content .page-web-elements-description-input {
  margin: 0 !important;
  padding: 0 !important;
  text-align: left !important;
}
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-term {
  grid-column: 2 !important;
  grid-row: 1 !important;
  align-self: start !important;
  margin: 0 !important;
}
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-content {
  grid-column: 2 !important;
  grid-row: 2 !important;
  align-self: stretch !important;
  justify-self: stretch !important;
  margin: 0 !important;
}
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-dot {
  grid-column: 1 !important;
  grid-row: 2 !important;
}
${itemsSingleRow} {
  grid-template-rows: auto;
}
${dotsSingleRow} {
  grid-row: 1;
  align-self: center;
}
${contentSingleRow} {
  grid-row: 1;
}
`;
}

