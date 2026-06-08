
import { useState, FormEvent } from 'react';
import '../styles/idea-input.css';

interface IdeaInputProps {
  onSubmit: (idea: string) => void;
  disabled: boolean;
}

const PLACEHOLDER = 'e.g. Build a library management system for a small public library';

export default function IdeaInput({ onSubmit, disabled }: IdeaInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <label className="idea-label" htmlFor="project-idea">
        Project Idea
      </label>
      <div className="idea-row">
        <input
          id="project-idea"
          className="idea-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDER}
          disabled={disabled}
          maxLength={2000}
          autoFocus
        />
        <button
          type="submit"
          className="primary-button"
          disabled={disabled || value.trim().length < 3}
        >
          {disabled ? 'Generating…' : 'Generate Specification'}
        </button>
      </div>
      <p className="idea-hint">
        Get an overview, functional & non-functional requirements,
        user stories, acceptance criteria, and an MVP scope.
      </p>
    </form>
  );
}
