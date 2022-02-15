// ==UserScript==
// @name         KaTeXFlowy
// @namespace    https://github.com/BettyJJ
// @version      0.2.5
// @description  Supports formula rendering in WorkFlowy with KaTeX
// @author       Betty
// @match        https://workflowy.com/*
// @match        https://*.workflowy.com/*
// @run-at       document-idle
// @grant        GM.addStyle
// @grant        GM_getResourceText
// @resource     KATEX_CSS https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/katex.min.css
// @require      https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/katex.min.js
// @require      https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/contrib/auto-render.min.js
// ==/UserScript==

(function () {
	'use strict';


	init();


	/**
	 * initialize
	 */
	function init() {
		watch_page();

		load_css();

		hide_raw();

	}


	/**
	 * watch the page
	 */
	function watch_page() {

		// wathe the page, so that the rendering is updated when new contents come in as the user edits or navigates
		const observer = new MutationObserver(function (mutationlist) {
			for (const { addedNodes } of mutationlist) {
				for (const node of addedNodes) {
					if (!node.tagName) continue; // not an element

					// watch ordinary node
					if (node.classList.contains('innerContentContainer')) {
						handle_node(node);
					}

					// watch the title when it becomes empty
					if (node.classList.contains('contentEditablePlaceholder')) {
						handle_untitled(node);
					}

				}
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });

	}


	/**
	 * insert a container after the node with formula to contain the rendered result
	 * @param {Node} node Dom Node
	 */
	function handle_node(node) {
		// sometimes there is a dummy node without parent. don't know why, but we need to check and exclude it first
		const parent = node.parentElement;
		if (!parent) {
			return;
		}

		// remove the class and container we previously added to avoid duplication
		remove_old(node);

		// check if the node contains anything that should be rendered
		if (!should_render(node)) {
			return;
		}

		// give the parent a class name so we can handle it later
		parent.classList.add('has-latex');

		// add an element to contain the rendered latex
		const container = document.createElement('div');
		container.innerHTML = node.innerHTML;
		container.className = 'rendered-latex';
		parent.insertAdjacentElement('afterend', container);

		// replicate this class name of the parent so that the rendered block can preserve WF's original style
		container.classList.add(parent.classList[1]);

		// render it
		const options = {
			delimiters: [
				{ left: '$$', right: '$$', display: true },
				{ left: '$', right: '$', display: false }
			]
		};
		renderMathInElement(container, options);

		// when the element is clicked, make the focus in the corresponding node so that the user can begin typing
		container.addEventListener('click', () => {
			parent.focus();
		});

	}


	/**
	 * check if the node contains anything that should be rendered
	 * @param {Node} node Dom Node
	 * @returns {boolean}
	 */
	function should_render(node) {
		// use $ or $$ as delimiters
		const text = node.textContent;
		const regex = /\$(\$)?(.+?)\$(\$)?/s;
		const match = text.match(regex);
		if (match !== null) {
			return true;
		}

		return false;
	}


	/**
	 * hide the raw content with LaTeX. only shows it when it has focus
	 */
	function hide_raw() {
		GM.addStyle('.name .has-latex .innerContentContainer { display:none } ');
		GM.addStyle('.name .has-latex.content { height: 0; min-height: 0 } ');

		GM.addStyle('.name--focused .has-latex .innerContentContainer { display:inline} ');
		GM.addStyle('.name--focused .has-latex.content { height: auto} ');

		// add a background to make the raw part look clearer
		GM.addStyle('.name--focused .has-latex { background: #eee } ');

		// preserve line breaks in notes
		GM.addStyle('.notes .rendered-latex { white-space: pre-wrap } ');
	}


	/**
	 * load KaTeX css
	 */
	function load_css() {
		let css = GM_getResourceText("KATEX_CSS");

		// the font path in the css file is relative, we need to change it to absolute
		css = css.replace(
			/fonts\//g,
			'https://cdn.jsdelivr.net/npm/katex@0.15.2/dist/fonts/'
		);

		GM.addStyle(css);
	}

	/**
	 * remove the class and container we previously added to avoid duplication
	 * @param {Node} node Dom Node
	 */
	function remove_old(node) {
		const parent = node.parentElement;

		// if a container already exists, remove it first to avoid duplication
		if (parent.nextSibling && parent.nextSibling.classList.contains('rendered-latex')) {
			parent.nextSibling.remove();

			// also remove the class name we added previously
			parent.classList.remove('has-latex');
		}

		// if a node becomes empty, remove the container and class name
		remove_empty();
	}


	/**
	 * if the node is the title of the page, it needs something special handling
	 */
	function handle_untitled() {
		// when the title becomes empty, remove the rendered container
		remove_empty();
	}


	/**
	 * remove all the containers and class names associated with empty nodes
	 */
	function remove_empty() {
		const empty = document.querySelectorAll('.has-latex:empty');
		for (let i = empty.length - 1; i >= 0; i--) {
			const element = empty[i];
			if (element.nextSibling && element.nextSibling.classList.contains('rendered-latex')) {
				element.nextSibling.remove();
				element.classList.remove('has-latex');
			}
		}
	}


})();
