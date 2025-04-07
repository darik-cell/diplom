import React, { useState, useMemo, useCallback } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';

// Для Vim-режима
import { vim } from '@replit/codemirror-vim';
import { keymap } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import { lineNumbers } from '@codemirror/view';

// Markdown + плагины
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

// Иконки (установите react-icons или замените на любые другие)
import { FaPencilAlt, FaEye } from 'react-icons/fa';

// Стили для KaTeX, подсветки и базовой github-стилизации
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import 'github-markdown-css/github-markdown.css';

const GET_COLLECTION = gql`
  query GetCollection($id: ID!) {
    collection(id: $id) {
      id
      name
    }
  }
`;

// Плагин для относительной нумерации строк
const relativeLineNumbers = lineNumbers({
    formatNumber: (lineNo, state) => {
        const currentLine = state.doc.lineAt(state.selection.main.head).number;
        return lineNo === currentLine
            ? String(lineNo)
            : String(Math.abs(lineNo - currentLine));
    },
});

// "jj" -> Escape
function jjKeymap() {
    return keymap.of([
        {
            key: 'j',
            run: (view) => {
                const now = Date.now();
                const state = view.state.field(vimState, false);
                if (!state) return false;

                const { lastKeyDownTime, lastKey } = state;
                if (lastKey === 'j' && now - lastKeyDownTime < 300) {
                    vim().commands.esc(view);
                    return true;
                }
                return false;
            },
        },
    ]);
}

const vimState = StateField.define({
    create: () => ({ lastKey: null, lastKeyDownTime: 0 }),
    update(value, tr) {
        if (tr.userEvent && tr.userEvent.startsWith('input.type')) {
            const now = Date.now();
            const ch = tr.newDoc.sliceString(tr.changes.from, tr.changes.to);
            return { lastKey: ch, lastKeyDownTime: now };
        }
        return value;
    },
});

// Собственный обработчик для "==...==" -> <mark>...<mark>
function MarkdownHighlight({ children }) {
    if (typeof children === 'string') {
        // Заменяем ==...== на <mark>...<mark>
        const replaced = children.replace(/==([^=]+)==/g, '<mark>$1</mark>');
        return <span dangerouslySetInnerHTML={{ __html: replaced }} />;
    }
    // Если нода не строка, выводим как есть
    return <>{children}</>;
}

const AddCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_COLLECTION, {
        variables: { id: collectionId },
    });

    const [cardText, setCardText] = useState('');
    const [vimMode, setVimMode] = useState(false);
    // Режим выделения (карандаш)
    const [annotationMode, setAnnotationMode] = useState(false);

    // Базовые расширения CodeMirror
    const baseExtensions = useMemo(() => [markdown(), relativeLineNumbers], []);

    // Если включён Vim-режим
    const editorExtensions = useMemo(() => {
        if (!vimMode) return baseExtensions;
        return [...baseExtensions, vim(), vimState, jjKeymap()];
    }, [vimMode, baseExtensions]);

    // При mouseUp в предпросмотре, если annotationMode=true, оборачиваем выделенный текст в "==...=="
    const handlePreviewMouseUp = useCallback(() => {
        if (!annotationMode) return;

        const selection = window.getSelection();
        if (!selection) return;

        const selectedText = selection.toString();
        if (!selectedText) return;

        // Простой вариант: ищем первое вхождение в cardText
        const idx = cardText.indexOf(selectedText);
        if (idx === -1) return;

        // Оборачиваем выделенный фрагмент в "==...=="
        const newText =
            cardText.slice(0, idx) +
            '==' +
            selectedText +
            '==' +
            cardText.slice(idx + selectedText.length);

        setCardText(newText);

        // Снимаем выделение
        selection.removeAllRanges();
    }, [annotationMode, cardText]);

    if (loading) {
        return <Container fluid>Загрузка...</Container>;
    }
    if (error) {
        return <Container fluid>Ошибка: {error.message}</Container>;
    }

    return (
        <Container
            fluid
            className="m-0 p-0 d-flex flex-column"
            style={{ minHeight: '100vh' }}
        >
            {/* Верхняя часть */}
            <Row className="mx-0" style={{ flexShrink: 0 }}>
                <Col className="p-3">
                    <h2>Редактор ({data.collection.name})</h2>
                </Col>

                {/* Заголовок предпросмотра + кнопки (карандаш, глаз) справа */}
                <Col
                    className="p-3 d-flex justify-content-end align-items-center"
                    style={{ flexShrink: 0 }}
                >
                    <h2 className="mb-0 me-3">Предпросмотр</h2>

                    {/* Кнопка с карандашом */}
                    <Button
                        variant={annotationMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        className="me-2"
                        onClick={() => setAnnotationMode((prev) => !prev)}
                    >
                        <FaPencilAlt />
                    </Button>

                    {/* Кнопка с глазом (пока без логики) */}
                    <Button variant="outline-secondary" size="sm">
                        <FaEye />
                    </Button>
                </Col>
            </Row>
            <hr className="m-0" />

            {/* Средняя часть: редактор и предпросмотр */}
            <Row className="mx-0 flex-grow-1" style={{ overflow: 'auto' }}>
                <Col
                    md={6}
                    className="p-0"
                    style={{ borderRight: '1px solid #ccc', overflow: 'auto' }}
                >
                    <CodeMirror
                        value={cardText}
                        theme={githubLight}
                        extensions={editorExtensions}
                        height="100%"
                        onChange={(value) => setCardText(value)}
                    />
                </Col>

                <Col
                    md={6}
                    className="p-3"
                    style={{ overflow: 'auto' }}
                    // Отслеживаем mouseUp для выделения
                    onMouseUp={handlePreviewMouseUp}
                >
                    <div className="markdown-body">
                        <ReactMarkdown
                            // Подключаем плагины
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                            // Включаем "breaks" => одинарный перенос строки = <br />
                            breaks={true}
                            // Заменяем "==...==" на <mark>...<mark>
                            components={{
                                text: ({ children }) => <MarkdownHighlight>{children}</MarkdownHighlight>,
                            }}
                        >
                            {cardText}
                        </ReactMarkdown>
                    </div>
                </Col>
            </Row>

            {/* Нижняя панель с кнопками */}
            <Row className="mx-0" style={{ flexShrink: 0 }}>
                <Col
                    xs={12}
                    className="d-flex justify-content-between align-items-center p-3"
                    style={{ borderTop: '1px solid #ccc' }}
                >
                    <Button
                        variant={vimMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        onClick={() => setVimMode((prev) => !prev)}
                    >
                        {vimMode ? 'Отключить Vim' : 'Включить Vim'}
                    </Button>

                    <Button variant="primary" size="sm">
                        Добавить карточку
                    </Button>
                </Col>
            </Row>
        </Container>
    );
};

export default AddCards;
