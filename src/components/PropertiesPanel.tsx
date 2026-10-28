import { useCanvasStore } from "../store/canvasStore";
export default function PropertiesPanel() {
  const state = useCanvasStore();
  const selected = state.strokes.find((stroke) => state.selection.includes(stroke.id));
  const color = selected?.color ?? state.color; const fill = selected?.fill ?? state.fill;
  const width = selected?.width ?? state.strokeWidth; const dash = selected?.dash ?? state.dash;
  const update = (patch: { color?: string; fill?: string; width?: number; dash?: "solid" | "dashed" }) => {
    if (selected) state.updateSelectedStyle(patch); else {
      if (patch.color) state.setColor(patch.color); if (patch.fill !== undefined) state.setFill(patch.fill);
      if (patch.width) state.setStrokeWidth(patch.width); if (patch.dash) state.setDash(patch.dash);
    }
  };
  return <aside className="properties-panel">
    <div className="toolbar-heading">{selected ? "OBJECT STYLE" : "DEFAULT STYLE"}</div>
    {selected && <p className="selection-hint">Selected {selected.kind}</p>}
    {!selected && <div className="property-group"><label htmlFor="board-background">Canvas background</label><div className="color-control"><input id="board-background" type="color" value={state.background} onChange={(event) => state.setBackground(event.target.value)} /><span>{state.background.toUpperCase()}</span></div></div>}
    <div className="property-group"><label htmlFor="stroke-color">Stroke color</label><div className="color-control"><input id="stroke-color" type="color" value={color} onChange={(event) => update({ color: event.target.value })} /><span>{color.toUpperCase()}</span></div></div>
    <div className="property-group"><label htmlFor="fill-color">Fill</label><select id="fill-color" value={fill} onChange={(event) => update({ fill: event.target.value })}><option value="transparent">Transparent</option><option value="#ffffff">White</option><option value="#e7e5ff">Lavender</option><option value="#d9f4e8">Mint</option><option value="#fff0c2">Soft yellow</option><option value="#ffe1e1">Soft pink</option></select></div>
    <div className="property-group"><label htmlFor="stroke-width">Stroke width</label><select id="stroke-width" value={width} onChange={(event) => update({ width: Number(event.target.value) })}><option value={1}>Thin</option><option value={2}>Normal</option><option value={4}>Thick</option><option value={6}>Extra thick</option></select></div>
    <div className="property-group"><label htmlFor="stroke-dash">Line style</label><select id="stroke-dash" value={dash} onChange={(event) => update({ dash: event.target.value as "solid" | "dashed" })}><option value="solid">Solid</option><option value="dashed">Dashed</option></select></div>
    <div className="toolbar-divider" /><div className="property-group"><label htmlFor="zoom-level">Canvas zoom</label><input id="zoom-level" className="zoom-slider" type="range" min={25} max={300} step={5} value={state.zoom} onChange={(event) => state.setZoom(Number(event.target.value))} /><span className="zoom-label">{state.zoom}%</span></div>
    {selected && <button className="action-button" type="button" onClick={() => state.deleteSelected()}>Delete selected</button>}
    <p className="shortcut-note">V select · P pencil · R rectangle · O ellipse · L line · A arrow · T text · E eraser · Space pan</p>
  </aside>;
}
