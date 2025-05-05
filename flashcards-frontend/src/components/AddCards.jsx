import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { gql, useQuery, useMutation } from '@apollo/client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';

// Replit/Codemirror Vim
import { vim } from '@replit/codemirror-vim';
import { StateField } from '@codemirror/state';
import { lineNumbers } from '@codemirror/view';

// Markdown + плагины
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

import { FaPencilAlt, FaEye } from 'react-icons/fa';

// Стили для KaTeX, подсветки, GitHub-стили
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import 'github-markdown-css/github-markdown.css';

// Обработка ??...??
import { processMarkedText } from '../utils/highlightLogic';

const GET_COLLECTION = gql`
    query GetCollection($id: ID!) {
        collection(id: $id) {
            id
            name
        }
    }
`;

// Мутация для создания карточки
const SAVE_CARD = gql`
    mutation SaveCard($card: CardInp!) {
        saveCard(card: $card) {
            id
            text
            collection {
                id
                name
            }
            createdAt
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

// Просто пустой StateField, чтобы Vim инициализировался
const vimState = StateField.define({
    create: () => ({}),
    update(value, tr) {
        return value;
    },
});

const AddCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_COLLECTION, {
        variables: { id: collectionId },
    });

    const [cardText, setCardText] = useState('');
    const [vimMode, setVimMode] = useState(false);
    const [annotationMode, setAnnotationMode] = useState(false);
    const [clozeMode, setClozeMode] = useState(false);

    const hiddenContentsRef = useRef([]);

    // Инициализация useMutation
    const [saveCard, { loading: saving, error: saveError }] = useMutation(SAVE_CARD, {
        // Если требуется обновлять список карточек коллекции после сохранения:
        refetchQueries: [{ query: GET_COLLECTION, variables: { id: collectionId } }],
        // Можно добавить update или onCompleted для дополнительных действий
    });

    // Базовые плагины CodeMirror
    const baseExtensions = useMemo(() => [markdown(), relativeLineNumbers], []);

    // Собираем плагины с учётом vimMode
    const editorExtensions = useMemo(() => {
        return vimMode ? [...baseExtensions, vimState, vim()] : baseExtensions;
    }, [vimMode, baseExtensions]);

    // При mouseUp в предпросмотре, если annotationMode=true, оборачиваем выделенный текст в "==...=="
    const handlePreviewMouseUp = useCallback(() => {
        if (!annotationMode) return;

        const selection = window.getSelection();
        if (!selection) return;

        const selectedText = selection.toString();
        if (!selectedText) return;

        // Ищем первое вхождение в cardText
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
        selection.removeAllRanges();
    }, [annotationMode, cardText]);

    // Обработка ??...??
    hiddenContentsRef.current = [];
    const processedText = processMarkedText(cardText, clozeMode, hiddenContentsRef.current);

    // Обработчик клика для добавления карточки
    const handleAddCard = async () => {
        try {
            const inputCard = {
                text: cardText,
                collection: { id: collectionId }
            };

            await saveCard({ variables: { card: inputCard } });
            // Например, можно очистить редактор после сохранения
            setCardText('');
        } catch (error) {
            console.error('Ошибка при сохранении карточки:', error);
        }
    };

    if (loading) {
        return <Container fluid>Загрузка...</Container>;
    }
    if (error) {
        return <Container fluid>Ошибка: {error.message}</Container>;
    }

    return (
        <Container fluid className="m-0 p-0 d-flex flex-column" style={{ minHeight: '100vh' }}>
            {/* Верхняя часть */}
            <Row className="mx-0" style={{ flexShrink: 0 }}>
                <Col className="p-3">
                    <h2>Редактор ({data.collection.name})</h2>
                </Col>
                <Col className="p-3 d-flex justify-content-end align-items-center" style={{ flexShrink: 0 }}>
                    <h2 className="mb-0 me-3">Предпросмотр</h2>

                    <Button
                        variant={annotationMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        className="me-2"
                        onClick={() => setAnnotationMode(prev => !prev)}
                    >
                        <FaPencilAlt />
                    </Button>

                    <Button
                        variant={clozeMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        onClick={() => setClozeMode(prev => !prev)}
                    >
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
                        onChange={value => setCardText(value)}
                    />
                </Col>

                <Col
                    md={6}
                    className="p-3"
                    style={{ overflow: 'auto' }}
                    onMouseUp={handlePreviewMouseUp}
                >
                    <div className="markdown-body">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                            skipHtml={false}
                            breaks={true}
                        >
                            {processedText}
                        </ReactMarkdown>
                    </div>
                </Col>
            </Row>

            {/* Нижняя панель */}
            <Row className="mx-0" style={{ flexShrink: 0 }}>
                <Col
                    xs={12}
                    className="d-flex justify-content-between align-items-center p-3"
                    style={{ borderTop: '1px solid #ccc' }}
                >
                    <Button
                        variant={vimMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        onClick={() => setVimMode(prev => !prev)}
                    >
                        {vimMode ? 'Отключить Vim' : 'Включить Vim'}
                    </Button>

                    <Button variant="primary" size="sm" onClick={handleAddCard}>
                        Добавить карточку
                    </Button>
                </Col>
            </Row>
        </Container>
    );
};

export default AddCards;
