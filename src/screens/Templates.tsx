import { useState } from 'react';
import { COLLECTIONS, TEMPLATES, getCollection } from '../lib/templates';
import { useStore } from '../store';
import { StripPreview } from '../components/StripPreview';
import { Chip } from '../components/ui';
import type { CollectionId, Customization, Template } from '../types';

export function Templates() {
  const [filter, setFilter] = useState<CollectionId | 'all'>('all');
  const { templateId, pickTemplate, go } = useStore();
  const list = filter === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.collection === filter);

  return (
    <section className="screen">
      <header className="screen-head">
        <h2>CHOOSE YOUR STAGE</h2>
        <p className="muted">{TEMPLATES.length} strips in {COLLECTIONS.length} collections. You can recolor and restyle any of them later.</p>
      </header>
      <div className="row wrap tabs" role="tablist">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          ALL
        </Chip>
        {COLLECTIONS.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            {c.name.toUpperCase()}
          </Chip>
        ))}
      </div>
      {filter !== 'all' && <p className="muted">{getCollection(filter).blurb}</p>}
      <div className="tpl-grid">
        {list.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            on={t.id === templateId}
            onClick={() => {
              pickTemplate(t.id);
              go('booth');
            }}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateCard({ t, on, onClick }: { t: Template; on: boolean; onClick: () => void }) {
  const cust: Customization = {
    ...t.defaults,
    subtitle: '',
    showDate: true,
    showScore: true,
    stickers: [],
  };
  return (
    <button className={`tpl-card ${on ? 'tpl-on' : ''}`} onClick={onClick}>
      <div className="tpl-thumb">
        <StripPreview template={t} cust={cust} scale={0.28} label={`${t.name} template`} />
      </div>
      <span className="tpl-name">{t.name}</span>
      <span className="tpl-col">{getCollection(t.collection).name}</span>
    </button>
  );
}
