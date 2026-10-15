// Gera campos de formulário a partir de uma lista de definições (evita repetir HTML).

import { escape_html } from '../utils/dom_utils.js';
import { to_number } from '../utils/format_utils.js';

export function render_fields(fields, values, name_prefix = '') {
  return fields.map((field) => {
    const value = values[field.key] ?? '';
    const name = `${name_prefix}${field.key}`;
    const input = field.options
      ? `<select name="${name}">${field.options.map(([option_value, label]) =>
        `<option value="${option_value}" ${String(value) === option_value ? 'selected' : ''}>${escape_html(label)}</option>`).join('')}</select>`
      : `<input name="${name}" type="${field.type ?? 'number'}" ${field.step ? `step="${field.step}"` : ''}
          value="${escape_html(value)}" ${field.required ? 'required' : ''} ${field.placeholder ? `placeholder="${escape_html(field.placeholder)}"` : ''}>`;

    return `
      <label class="field ${field.wide ? 'field--wide' : ''}">
        <span>${escape_html(field.label)}</span>
        <div class="field-input">${input}${field.unit ? `<em>${escape_html(field.unit)}</em>` : ''}</div>
        ${field.hint ? `<small>${escape_html(field.hint)}</small>` : ''}
      </label>`;
  }).join('');
}

export function read_fields(form, fields, name_prefix = '') {
  return Object.fromEntries(fields.map((field) => {
    const raw = form.elements[`${name_prefix}${field.key}`]?.value ?? '';
    const is_numeric = !field.type || field.type === 'number';
    return [field.key, is_numeric && !field.options ? to_number(raw) : raw];
  }));
}
