import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { parseMultiLineNotes } from '../utils/notesParser';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Trash2, 
  FileText,
  HelpCircle
} from 'lucide-react';

export const MagicNotesModal = () => {
  const { isMagicNoteOpen, setIsMagicNoteOpen, categories, batchAddExpenses, currency } = useApp();
  const [noteContent, setNoteContent] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [importCount, setImportCount] = useState(0);

  useEffect(() => {
    if (noteContent.trim()) {
      const results = parseMultiLineNotes(noteContent, categories);
      setParsedItems(results);
    } else {
      setParsedItems([]);
    }
  }, [noteContent, categories]);

  if (!isMagicNoteOpen) return null;

  const handleRemoveParsedItem = (index) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;
    const count = await batchAddExpenses(parsedItems);
    setImportCount(count);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setNoteContent('');
      setParsedItems([]);
      setIsMagicNoteOpen(false);
    }, 1400);
  };

  const getCategoryDetails = (catId) => {
    return categories.find(c => c.id === catId) || { name: 'Misc', icon: '📦', color: '#64748b' };
  };

  const totalParsedAmount = parsedItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="modal-overlay" onClick={() => setIsMagicNoteOpen(false)}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Notes Magic Importer</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Paste raw notes from your phone — we'll auto-extract amount & category!
              </p>
            </div>
          </div>
          <button onClick={() => setIsMagicNoteOpen(false)} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle2 size={54} style={{ color: 'var(--color-success)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Awesome!</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Successfully imported {importCount} expenses ({currency.symbol}{totalParsedAmount.toLocaleString()}) into your tracker!
            </p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Paste raw text here:
              </label>
            </div>

            {/* Textarea */}
            <textarea
              rows={5}
              className="textarea"
              placeholder={`Example:\nDinner 650 upi\nUber 280\nMilk & Eggs 120 card`}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              style={{ fontSize: '0.9rem', lineHeight: '1.6', resize: 'vertical' }}
            />

            {/* Parsed Preview Section */}
            {parsedItems.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Detected {parsedItems.length} Expenses
                  </span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    Total: {currency.symbol}{totalParsedAmount.toLocaleString()}
                  </span>
                </div>

                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {parsedItems.map((item, idx) => {
                    const cat = getCategoryDetails(item.categoryId);
                    return (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                              <span style={{ color: cat.color }}>{cat.name}</span>
                              <span>•</span>
                              <span style={{ textTransform: 'uppercase' }}>{item.paymentMethod}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: '#f87171' }}>
                            -{currency.symbol}{item.amount}
                          </span>
                          <button 
                            onClick={() => handleRemoveParsedItem(idx)}
                            className="btn-ghost" 
                            style={{ padding: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => setIsMagicNoteOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={parsedItems.length === 0}
                className="btn btn-primary"
                style={{ opacity: parsedItems.length === 0 ? 0.5 : 1 }}
              >
                <CheckCircle2 size={16} />
                <span>Import {parsedItems.length > 0 ? `(${parsedItems.length})` : ''} to Expenses</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
