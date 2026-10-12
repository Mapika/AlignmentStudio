import React, { useId } from 'react';
import type { InformationItem } from '../../types';
import { InformationType } from '../../types';
import { TrashIcon } from '../icons';

interface InformationItemEditorProps {
  item: InformationItem;
  index?: number;
  onUpdate: (id: string, field: keyof InformationItem, value: string | InformationType) => void;
  onRemove: (id: string) => void;
}

export const InformationItemEditor: React.FC<InformationItemEditorProps> = ({ item, index = 0, onUpdate, onRemove }) => {
  const inputId = useId();
  return <fieldset className={index ? 'border-t border-[var(--line)] pt-7 pb-7' : 'pb-7'}>
    <legend className="sr-only">{item.title || 'Untitled evidence block'}</legend>
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">Block {index + 1}</span>
      <button type="button" onClick={() => onRemove(item.id)} className="text-button is-danger inline-flex items-center gap-2 font-medium" aria-label={`Remove evidence block: ${item.title || 'Untitled'}`}><TrashIcon /><span>Remove</span></button>
    </div>
    <div className="mb-4 grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <div><label htmlFor={`${inputId}-type`}>Evidence type</label>
        <select id={`${inputId}-type`} value={item.type} onChange={(event) => onUpdate(item.id, 'type', event.target.value as InformationType)} className="field">
          {Object.values(InformationType).map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>
      <div className="min-w-0"><label htmlFor={`${inputId}-title`}>Evidence title</label>
        <input id={`${inputId}-title`} type="text" placeholder="For example: project approval policy" value={item.title} onChange={(event) => onUpdate(item.id, 'title', event.target.value)} className="field" />
      </div>
    </div>
    <label htmlFor={`${inputId}-content`}>Evidence content</label>
    <textarea id={`${inputId}-content`} placeholder="Paste the fictional document, message, or other context both candidates should receive…" value={item.content} onChange={(event) => onUpdate(item.id, 'content', event.target.value)} className="field min-h-36 resize-y" />
  </fieldset>;
};
