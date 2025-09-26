


import type { ToolName } from './tools/brush';

export type ToolShortcutEntry = {
  key: string;            
  tool: ToolName;         
  labelI18nKey: string;   
};


export const TOOL_SHORTCUT_LIST: ToolShortcutEntry[] = [
  { key: 'b', tool: 'brush',      labelI18nKey: 'editor.tool.brush' },
  { key: 'e', tool: 'eraser',     labelI18nKey: 'editor.tool.eraser' },
  { key: 'i', tool: 'eyedropper', labelI18nKey: 'editor.tool.eyedropper' },
  { key: 's', tool: 'select',     labelI18nKey: 'editor.tool.select' },
  { key: 'm', tool: 'magic',      labelI18nKey: 'editor.tool.magic' },
  { key: 'g', tool: 'gradient',   labelI18nKey: 'editor.tool.gradient' },
];


export const TOOL_SHORTCUTS: Record<string, ToolName> = Object.fromEntries(
  TOOL_SHORTCUT_LIST.map(({ key, tool }) => [key, tool])
) as Record<string, ToolName>;
