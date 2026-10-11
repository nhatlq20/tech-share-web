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
        <h3>Thông số kỹ thuật</h3>
        <p>Thêm thông tin giúp người thuê hiểu rõ hơn về thiết bị.</p>
      </div>

      {specifications.length === 0 ? (
        <div className="post-device-specs-empty">
          Chưa có thông số nào. Bạn có thể bỏ qua hoặc thêm thông tin bên dưới.
        </div>
      ) : (
        <div className="post-device-specs-list">
          <div className="post-device-specs-labels">
            <span>Tên thông số</span>
            <span>Giá trị</span>
            <span aria-hidden="true" />
          </div>
          {specifications.map((specification, index) => {
            const isEmptyName = showValidation && !specification.key.trim();
            const isDuplicateName = hasDuplicateName(specification.id, specification.key);

            return (
              <div className="post-device-spec-row" key={specification.id}>
                <label className="post-device-field">
                  <span className="post-device-mobile-label">Tên thông số</span>
                  <input
                    className={isEmptyName || isDuplicateName ? 'has-error' : ''}
                    value={specification.key}
                    onChange={(event) => handleFieldChange(specification.id, 'key', event.target.value)}
                    placeholder="Ví dụ: RAM"
                    aria-label={`Tên thông số ${index + 1}`}
                    aria-invalid={isEmptyName || isDuplicateName}
                  />
                  {isDuplicateName && <small className="post-device-error">Tên thông số không được trùng.</small>}
                  {isEmptyName && <small className="post-device-error">Vui lòng nhập tên thông số.</small>}
                </label>
                <label className="post-device-field">
                  <span className="post-device-mobile-label">Giá trị</span>
                  <input
                    value={specification.value}
                    onChange={(event) => handleFieldChange(specification.id, 'value', event.target.value)}
                    placeholder="Ví dụ: 16GB"
                    aria-label={`Giá trị thông số ${index + 1}`}
                  />
                </label>
                <button
                  type="button"
                  className="post-device-remove-spec"
                  onClick={() => removeSpecification(specification.id)}
                  aria-label={`Xóa thông số ${index + 1}`}
                  title="Xóa thông số"
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
        <span>Thêm thông số</span>
      </button>
    </div>
  );
};

export default SpecsBuilderForm;
