import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Send, Trash2, Pencil, X, Check } from 'lucide-react';

function Comments({ listId }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    loadComments();
  }, [listId]);

  async function loadComments() {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, username, display_name, avatar_url)')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        list_id: listId,
        body: newComment.trim(),
      })
      .select('*, profiles(id, username, display_name, avatar_url)')
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data]);
      setNewComment('');
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    await supabase.from('comments').delete().eq('id', commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const startEdit = (comment) => {
    setEditingId(comment.id);
    setEditText(comment.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async (commentId) => {
    if (!editText.trim()) return;
    const { error } = await supabase
      .from('comments')
      .update({ body: editText.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (!error) {
      setComments((prev) =>
        prev.map((c) => c.id === commentId ? { ...c, body: editText.trim(), updated_at: new Date().toISOString() } : c)
      );
    }
    setEditingId(null);
    setEditText('');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <section className="mt-10">
      <h2 className="text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
        <MessageSquare size={18} />
        Comments ({comments.length})
      </h2>

      {/* Comment List */}
      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-3 mb-6">
          {comments.map((comment) => {
            const isOwn = user && comment.user_id === user.id;
            const isEditing = editingId === comment.id;
            const commenter = comment.profiles;

            return (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <Link to={commenter?.username ? `/user/${commenter.username}` : '#'} className="shrink-0">
                  {commenter?.avatar_url ? (
                    <img src={commenter.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-xs font-medium">
                      {(commenter?.display_name || '?')[0].toUpperCase()}
                    </div>
                  )}
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={commenter?.username ? `/user/${commenter.username}` : '#'}
                      className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-cyan)] transition-colors">
                      {commenter?.display_name || 'User'}
                    </Link>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {formatDate(comment.created_at)}
                      {comment.updated_at !== comment.created_at && ' (edited)'}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex gap-2">
                      <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
                        maxLength={2000} autoFocus />
                      <button onClick={() => saveEdit(comment.id)} className="text-[var(--color-accent-green)] hover:opacity-80">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEdit} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)] break-words">{comment.body}</p>
                  )}

                  {/* Actions */}
                  {isOwn && !isEditing && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => startEdit(comment)}
                        className="text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors flex items-center gap-0.5">
                        <Pencil size={10} /> Edit
                      </button>
                      <button onClick={() => handleDelete(comment.id)}
                        className="text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] transition-colors flex items-center gap-0.5">
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-xs font-medium">
                {(profile?.display_name || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 flex gap-2">
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
              maxLength={2000} />
            <button type="submit" disabled={submitting || !newComment.trim()}
              className="px-3 py-2 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
              <Send size={16} />
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">
          <Link to="/login" className="text-[var(--color-accent-cyan)] hover:underline">Sign in</Link> to leave a comment.
        </p>
      )}
    </section>
  );
}

export default Comments;
