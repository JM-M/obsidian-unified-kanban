import React from 'react';

interface FilterBarProps {
  allColumns: string[];
  allProjects: string[];
  hiddenColumns: string[];
  hiddenProjects: string[];
  projectColors: Record<string, string>;
  onToggleColumn: (name: string) => void;
  onToggleProject: (name: string) => void;
}

export function FilterBar({
  allColumns,
  allProjects,
  hiddenColumns,
  hiddenProjects,
  projectColors,
  onToggleColumn,
  onToggleProject,
}: FilterBarProps) {
  return (
    <div className="uk-filter-bar">
      <div className="uk-filter-bar__group">
        {allColumns.map((col) => (
          <button
            key={col}
            className={`uk-filter-chip${hiddenColumns.includes(col) ? ' uk-filter-chip--hidden' : ''}`}
            onClick={() => onToggleColumn(col)}
            title={hiddenColumns.includes(col) ? `Show "${col}"` : `Hide "${col}"`}
          >
            {col}
          </button>
        ))}
      </div>
      {allProjects.length > 0 && (
        <>
          <div className="uk-filter-bar__divider" />
          <div className="uk-filter-bar__group">
            {allProjects.map((proj) => (
              <button
                key={proj}
                className={`uk-filter-chip${hiddenProjects.includes(proj) ? ' uk-filter-chip--hidden' : ''}`}
                onClick={() => onToggleProject(proj)}
                title={hiddenProjects.includes(proj) ? `Show "${proj}"` : `Hide "${proj}"`}
              >
                {projectColors[proj] && (
                  <span
                    className="uk-filter-chip__dot"
                    style={{ background: projectColors[proj] }}
                  />
                )}
                {proj}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
