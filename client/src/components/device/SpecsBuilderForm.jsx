import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const SpecsBuilderForm = ({ specifications, showValidation, onChange }) => {
  const handleFieldChange = (id, field, value) => {
    onChange(specifications.map((specification) =>
      specification.id === id ? { ...specification, [field]: value } : specification
    ));
  };

  const addSpecification = () => {
    onChange([
      ...specifications,
      { id: Date.now() + Math.random(), key: '', value: '' },
    ]);
  };

  const removeSpecification = (id) => {
    onChange(specifications.filter((specification) => specification.id !== id));
  };

  const hasDuplicateName = (id, name) => {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) return false;

    return specifications.some((specification) =>
      specification.id !== id && specification.key.trim().toLowerCase() === normalizedName
    );
  };

  return (
    <div className="post-device-specs">
      <div className="post-device-specs-heading">
        <h3>Technical Specifications</h3>
        <p>Add details to help renters learn more about your device.</p>
      </div>

      {specifications.length === 0 ? (
        <div className="post-device-specs-empty">
          No specifications added. You can skip this step or add details below.
        </div>
      ) : (
        <div className="post-device-specs-list">
          <div className="post-device-specs-labels">
            <span>Specification</span>
            <span>Value</span>
            <span aria-hidden="true" />
          </div>
          {specifications.map((specification, index) => {
            const isEmptyName = showValidation && !specification.key.trim();
            const isDuplicateName = hasDuplicateName(specification.id, specification.key);

            return (
              <div className="post-device-spec-row" key={specification.id}>
                <label className="post-device-field">
                  <span className="post-device-mobile-label">Specification</span>
                  <input
                    className={isEmptyName || isDuplicateName ? 'has-error' : ''}
                    value={specification.key}
                    onChange={(event) => handleFieldChange(specification.id, 'key', event.target.value)}
                    placeholder="e.g. RAM"
                    aria-label={`Specification ${index + 1}`}
                    aria-invalid={isEmptyName || isDuplicateName}
                  />
                  {isDuplicateName && <small className="post-device-error">Specification names must be unique.</small>}
                  {isEmptyName && <small className="post-device-error">Please enter a specification name.</small>}
                </label>
                <label className="post-device-field">
                  <span className="post-device-mobile-label">Value</span>
                  <input
                    value={specification.value}
                    onChange={(event) => handleFieldChange(specification.id, 'value', event.target.value)}
                    placeholder="e.g. 16 GB"
                    aria-label={`Specification value ${index + 1}`}
                  />
                </label>
                <button
                  type="button"
                  className="post-device-remove-spec"
                  onClick={() => removeSpecification(specification.id)}
                  aria-label={`Remove specification ${index + 1}`}
                  title="Remove specification"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className="post-device-add-spec" onClick={addSpecification}>
        <Plus size={17} />
        <span>Add Specification</span>
      </button>
    </div>
  );
};

export default SpecsBuilderForm;
