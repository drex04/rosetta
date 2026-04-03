import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PropertyData } from '@/types/index';

const XSD_DATATYPES = [
  { label: 'xsd:string', value: 'xsd:string' },
  { label: 'xsd:integer', value: 'xsd:integer' },
  { label: 'xsd:decimal', value: 'xsd:decimal' },
  { label: 'xsd:boolean', value: 'xsd:boolean' },
  { label: 'xsd:dateTime', value: 'xsd:dateTime' },
  { label: 'xsd:anyURI', value: 'xsd:anyURI' },
];

interface AddPropertyDialogProps {
  nodePrefix: string;
  onAdd: (property: PropertyData) => void;
  onClose: () => void;
}

export function AddPropertyDialog({
  nodePrefix,
  onAdd,
  onClose,
}: AddPropertyDialogProps) {
  const [name, setName] = useState('');
  const [uri, setUri] = useState('');
  const [range, setRange] = useState('xsd:string');
  const [uriManuallyEdited, setUriManuallyEdited] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!uriManuallyEdited) {
      const slug = value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const prefix = nodePrefix ? nodePrefix : 'onto';
      setUri(`${prefix}:${slug}`);
    }
  }

  function handleUriChange(value: string) {
    setUri(value);
    setUriManuallyEdited(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUri = uri.trim();
    if (!trimmedName || !trimmedUri) return;
    onAdd({
      uri: trimmedUri,
      label: trimmedName,
      range,
      kind: 'datatype',
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-popover border border-border rounded-lg shadow-xl w-80 p-5 z-10">
        <h2 className="text-sm font-medium text-foreground mb-4">
          Add Property
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              Property Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. trackId"
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              Property URI
            </label>
            <input
              type="text"
              value={uri}
              onChange={(e) => handleUriChange(e.target.value)}
              placeholder="onto:trackId"
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">
              XSD Datatype
            </label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {XSD_DATATYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || !uri.trim()}
            >
              Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
