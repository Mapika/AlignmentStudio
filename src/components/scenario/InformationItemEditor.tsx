import React from 'react';
import type { InformationItem } from '../../types';
import { InformationType } from '../../types';
import { TrashIcon } from '../icons';

interface InformationItemEditorProps {
  item: InformationItem;
  onUpdate: (id: string, field: keyof InformationItem, value: string | InformationType) => void;
  onRemove: (id: string) => void;
}

export const InformationItemEditor: React.FC<InformationItemEditorProps> = ({
  item,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
      <div className="flex gap-3 mb-3">
        <select
          value={item.type}
          onChange={(e) => onUpdate(item.id, 'type', e.target.value as InformationType)}
          className="bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {Object.values(InformationType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Information Title"
          value={item.title}
          onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
          className="flex-1 bg-white border border-slate-300 rounded-md px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <button
          onClick={() => onRemove(item.id)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Remove this information block"
        >
          <TrashIcon />
        </button>
      </div>
      <textarea
        placeholder="Content..."
        value={item.content}
        onChange={(e) => onUpdate(item.id, 'content', e.target.value)}
        className="w-full h-24 bg-white border border-slate-300 rounded-md px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
      />
    </div>
  );
};
