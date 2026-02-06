import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Plus } from 'lucide-react';
import { SCORE_CATEGORIES } from '../utils/categories';

function CreateListPage() {
  const { user, profile } = useAuth();

  const applyPreferredWeights = () => {
    if (!profile) return;
    setWeightTechnical(profile.pref_weight_technical ?? 1);
    setWeightStorytelling(profile.pref_weight_storytelling ?? 1);
    setWeightEnjoyment(profile.pref_weight_enjoyment ?? 1);
    setWeightXfactor(profile.pref_weight_xfactor ?? 1);
  };
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [weightTechnical, setWeightTechnical] = useState(1);
  const [weightStorytelling, setWeightStorytelling] = useState(1);
  const [weightEnjoyment, setWeightEnjoyment] = useState(1);
  const [weightXfactor, setWeightXfactor] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setCreating(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from('lists')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        is_public: isPublic,
        weight_technical: weightTechnical,
        weight_storytelling: weightStorytelling,
        weight_enjoyment: weightEnjoyment,
        weight_xfactor: weightXfactor,
      })
      .select('id')
      .single();

    if (createError) {
      setError(createError.message);
      setCreating(false);
      return;
    }

    navigate(`/list/${data.id}/edit`);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl text-[var(--color-accent-cyan)]">Create New List</h1>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-[var(--color-accent-red)] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "My Top 50 Anime Shows"'
            className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
            maxLength={100}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this list is about..."
            rows={3}
            className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors resize-none"
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Visibility</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                !isPublic
                  ? 'bg-[var(--color-accent-purple)] text-white'
                  : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Private
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                isPublic
                  ? 'bg-[var(--color-accent-green)] text-[var(--color-bg-primary)]'
                  : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Public
            </button>
          </div>
        </div>

        {/* Category Weights */}
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Category Weights</label>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            Adjust how much each category contributes to the overall score. Default is equal weight.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {SCORE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const valueMap = { technical: weightTechnical, storytelling: weightStorytelling, enjoyment: weightEnjoyment, xfactor: weightXfactor };
              const setterMap = { technical: setWeightTechnical, storytelling: setWeightStorytelling, enjoyment: setWeightEnjoyment, xfactor: setWeightXfactor };
              return (
                <div key={cat.key}>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mb-1" title={cat.description}>
                    <Icon size={12} /> {cat.label}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={valueMap[cat.key]}
                      onChange={(e) => setterMap[cat.key](parseFloat(e.target.value))}
                      className="flex-1 accent-[var(--color-accent-cyan)]"
                    />
                    <span className="text-sm text-[var(--color-accent-cyan)] w-10 text-right font-medium">
                      ×{valueMap[cat.key]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={applyPreferredWeights}
            className="mt-3 px-3 py-1.5 text-xs border border-[var(--color-border)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)] transition-colors"
          >
            Use My Preferred Weights
          </button>
        </div>

        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="w-full py-3 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          {creating ? 'Creating...' : 'Create List'}
        </button>
      </form>
    </div>
  );
}

export default CreateListPage;
