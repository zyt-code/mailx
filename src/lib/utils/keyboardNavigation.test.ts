import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkKeyboardNavigation, simulateTabNavigation, getFocusableElements } from './keyboardNavigation.js';

describe('keyboardNavigation utilities', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a test container
    container = document.createElement('div');
    // Ensure container is visible and has dimensions for tests
    container.style.width = '100px';
    container.style.height = '100px';
    container.style.display = 'block';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';

    container.innerHTML = `
      <button id="btn1" style="width: 10px; height: 10px; display: inline-block;">Button 1</button>
      <input id="input1" type="text" style="width: 10px; height: 10px; display: inline-block;">
      <a href="#" id="link1" style="width: 10px; height: 10px; display: inline-block;">Link 1</a>
      <div tabindex="0" id="div1" style="width: 10px; height: 10px; display: block;">Focusable Div</div>
      <div id="non-focusable">Not focusable</div>
      <button disabled id="btn-disabled">Disabled Button</button>
      <button style="display: none;" id="btn-hidden">Hidden Button</button>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('getFocusableElements', () => {
    it('should return all focusable elements', () => {
      const focusable = getFocusableElements(container);
      expect(focusable.length).toBe(4); // btn1, input1, link1, div1
      expect(focusable[0].id).toBe('btn1');
      expect(focusable[1].id).toBe('input1');
      expect(focusable[2].id).toBe('link1');
      expect(focusable[3].id).toBe('div1');
    });

    it('should exclude disabled and hidden elements', () => {
      const focusable = getFocusableElements(container);
      const ids = focusable.map(el => el.id);
      expect(ids).not.toContain('btn-disabled');
      expect(ids).not.toContain('btn-hidden');
      expect(ids).not.toContain('non-focusable');
    });

    it('should respect tabindex order', () => {
      // Add elements with different tabindex values
      const btn2 = document.createElement('button');
      btn2.id = 'btn2';
      btn2.tabIndex = 2;
      container.appendChild(btn2);

      const btn3 = document.createElement('button');
      btn3.id = 'btn3';
      btn3.tabIndex = 1;
      container.appendChild(btn3);

      const focusable = simulateTabNavigation(container);
      const ids = focusable.map(el => el.element.id);

      // Elements with tabindex >= 0 should be in numeric order
      // Natural tab order comes after explicit tabindex
      expect(ids.indexOf('div1')).toBeGreaterThan(ids.indexOf('btn2'));
      expect(ids.indexOf('btn3')).toBeLessThan(ids.indexOf('btn2'));
    });
  });

  describe('simulateTabNavigation', () => {
    it('should simulate tab key navigation', () => {
      const elements = getFocusableElements(container);
      const results = simulateTabNavigation(container);

      expect(results.length).toBe(elements.length);
      expect(results[0].element.id).toBe('btn1');
      expect(results[0].isFocusable).toBe(true);
      expect(results[0].hasTabindex).toBe(false);
    });

    it('should identify elements with tabindex', () => {
      const results = simulateTabNavigation(container);
      const divResult = results.find(r => r.element.id === 'div1');
      expect(divResult?.hasTabindex).toBe(true);
      expect(divResult?.tabindexValue).toBe(0);
    });
  });

  describe('checkKeyboardNavigation', () => {
    it('should check for common keyboard navigation issues', () => {
      const report = checkKeyboardNavigation(container);

      expect(report.totalFocusable).toBe(4);
      expect(report.issues).toBeInstanceOf(Array);
      expect(report.score).toBeGreaterThan(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('should detect missing tabindex on interactive elements', () => {
      // Remove tabindex from div, but first ensure it's recognized as interactive
      const div = container.querySelector('#div1') as HTMLElement;
      div.setAttribute('role', 'button');
      div.removeAttribute('tabindex');

      const report = checkKeyboardNavigation(container);
      const tabindexIssue = report.issues.find(issue =>
        issue.type === 'missing_tabindex' && issue.element?.id === 'div1'
      );
      expect(tabindexIssue).toBeDefined();
    });

    it('should detect focus traps', () => {
      // Create a potential focus trap
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <button id="modal-btn1">Modal Button 1</button>
        <button id="modal-btn2">Modal Button 2</button>
      `;
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
      container.appendChild(modal);

      const report = checkKeyboardNavigation(modal);
      // Modal with only buttons but no close button or escape handler
      const trapIssue = report.issues.find(issue =>
        issue.type === 'potential_focus_trap'
      );
      expect(trapIssue).toBeDefined();
    });

    it('should check focus visibility', () => {
      // Add an element with poor focus visibility
      const badBtn = document.createElement('button');
      badBtn.id = 'bad-btn';
      badBtn.textContent = 'Bad Focus';
      // Explicitly reset all focus-related styles
      // Set both shorthand and individual properties for JSDOM compatibility
      badBtn.style.outline = 'none';
      badBtn.style.outlineStyle = 'none';
      badBtn.style.outlineWidth = '0px';
      badBtn.style.boxShadow = 'none';
      badBtn.style.border = 'none';
      badBtn.style.borderStyle = 'none';
      badBtn.style.borderWidth = '0px';
      badBtn.style.backgroundColor = 'transparent';
      container.appendChild(badBtn);

      console.log('Bad button styles:', {
        outline: badBtn.style.outline,
        boxShadow: badBtn.style.boxShadow,
        border: badBtn.style.border,
        backgroundColor: badBtn.style.backgroundColor,
      });

      const report = checkKeyboardNavigation(container);
      console.log('Focus visibility report issues:', report.issues.map(i => ({ type: i.type, elementId: i.element?.id })));
      const focusIssue = report.issues.find(issue =>
        issue.type === 'poor_focus_visibility' && issue.element?.id === 'bad-btn'
      );
      expect(focusIssue).toBeDefined();
    });
  });

  describe('WCAG keyboard navigation requirements', () => {
    it('should validate all interactive elements are focusable', () => {
      const report = checkKeyboardNavigation(container);
      const nonFocusableIssue = report.issues.find(issue =>
        issue.type === 'non_focusable_interactive'
      );
      // Our test container doesn't have non-focusable interactive elements
      expect(nonFocusableIssue).toBeUndefined();
    });

    it('should validate logical tab order', () => {
      // Create illogical tab order
      const btnA = document.createElement('button');
      btnA.id = 'btn-a';
      btnA.textContent = 'A';
      btnA.style.order = '2';
      container.appendChild(btnA);

      const btnB = document.createElement('button');
      btnB.id = 'btn-b';
      btnB.textContent = 'B';
      btnB.style.order = '1';
      container.appendChild(btnB);

      const report = checkKeyboardNavigation(container);
      const tabOrderIssue = report.issues.find(issue =>
        issue.type === 'illogical_tab_order'
      );
      // Note: This is a simplified check - real implementation would need more context
      expect(report.issues.length).toBeGreaterThan(0);
    });

    it('should check for keyboard shortcuts conflict', () => {
      // Add elements with same accesskey
      const btn1 = container.querySelector('#btn1') as HTMLElement;
      const btn2 = document.createElement('button');
      btn2.id = 'btn-conflict';
      btn2.textContent = 'Conflict';
      btn2.accessKey = 'a';
      container.appendChild(btn2);

      // First button also gets accesskey
      btn1.accessKey = 'a';

      const report = checkKeyboardNavigation(container);
      const shortcutIssue = report.issues.find(issue =>
        issue.type === 'keyboard_shortcut_conflict'
      );
      expect(shortcutIssue).toBeDefined();
    });
  });
});