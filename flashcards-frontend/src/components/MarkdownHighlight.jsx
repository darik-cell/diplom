import React from 'react';
import { processMarkedText } from '../utils/highlightLogic'; // путь корректируйте под ваш проект

/**
 * Компонент для обработки текстовых узлов Markdown.
 * Заменяет ==...== на <mark> или <span class="cloze" ...>, в зависимости от isClozeView.
 */
function MarkdownHighlight({ children, isClozeView }) {
    // Часто React Markdown передаёт текст как массив, убедимся, что у нас именно строка
    if (typeof children === 'string') {
        const replacedHTML = processMarkedText(children, isClozeView);
        return <span dangerouslySetInnerHTML={{ __html: replacedHTML }} />;
    }

    // Если это не строка, возвращаем как есть
    return <>{children}</>;
}

export default MarkdownHighlight;
