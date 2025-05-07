// src/components/AddCards.jsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { gql, useQuery, useMutation } from '@apollo/client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';

// Vim‑режим
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

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import 'github-markdown-css/github-markdown.css';

import { processMarkedText } from '../utils/highlightLogic';

/* ---------- GraphQL ---------- */

const GET_COLLECTION = gql`
    query GetCollection($id: ID!) {
        collection(id: $id) {
            id
            name
            cards { id }   # чтобы refetch обновил количество
        }
    }
`;

const SAVE_CARD = gql`
    mutation SaveCard($card: CardInp!) {
        saveCard(card: $card) {
            id
            text
            createdAt
        }
    }
`;

/* ---------- Вспомогательные плагины CodeMirror ---------- */

const relativeLineNumbers = lineNumbers({
    formatNumber: (n, state) => {
        const cur = state.doc.lineAt(state.selection.main.head).number;
        return n === cur ? String(n) : String(Math.abs(n - cur));
    },
});

const vimState = StateField.define({
    create: () => ({}),
    update(v) { return v; }
});

/* ---------- Компонент ---------- */

const AddCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_COLLECTION, {
        variables: { id: collectionId },
    });

    const [cardText, setCardText]           = useState('');
    const [vimMode, setVimMode]             = useState(false);
    const [annotationMode, setAnnotation]   = useState(false);
    const [clozeMode, setClozeMode]         = useState(false);
    const hiddenContentsRef                 = useRef([]);

    const [saveCard, { loading: saving, error: saveError }] = useMutation(SAVE_CARD, {
        refetchQueries: [{ query: GET_COLLECTION, variables: { id: collectionId } }],
        onCompleted: () => {
            setCardText('');
            document.querySelector('.cm-content')?.focus();
        }
    });

    /* --- CodeMirror плагины --- */
    const baseExtensions = useMemo(() => [markdown(), relativeLineNumbers], []);
    const editorExtensions = useMemo(
        () => (vimMode ? [...baseExtensions, vimState, vim()] : baseExtensions),
        [vimMode, baseExtensions]
    );

    /* --- Обработчик выделения в предпросмотре --- */
    const handlePreviewMouseUp = useCallback(() => {
        if (!annotationMode) return;
        const sel = window.getSelection();
        const text = sel?.toString();
        if (!text) return;

        const idx = cardText.indexOf(text);
        if (idx === -1) return;

        setCardText(
            cardText.slice(0, idx) + '??' + text + '??' + cardText.slice(idx + text.length)
        );
        sel?.removeAllRanges();
    }, [annotationMode, cardText]);

    /* --- Cloze‑обработка текста --- */
    hiddenContentsRef.current = [];
    const processedText = processMarkedText(cardText, clozeMode, hiddenContentsRef.current);

    /* --- Сохранение карточки --- */
    const handleAddCard = async () => {
        if (!cardText.trim()) return;       // пустые строки не шлём

        try {
            await saveCard({
                variables: {
                    card: {
                        text: cardText,
                        collectionId: Number(collectionId)
                    }
                }
            });
        } catch (e) {
            console.error('Ошибка GraphQL', e);
        }
    };

    /* ---------- Render ---------- */

    if (loading)
        return <Container className="mt-4"><Spinner animation="border" /></Container>;
    if (error)
        return <Container className="mt-4">Ошибка: {error.message}</Container>;

    return (
        <Container fluid className="m-0 p-0 d-flex flex-column" style={{ minHeight: '100vh' }}>
            {/* Заголовок */}
            <Row className="mx-0" style={{ flexShrink: 0 }}>
                <Col className="p-3">
                    <h2>Редактор ({data.collection.name})</h2>
                </Col>
                <Col className="p-3 d-flex justify-content-end align-items-center">
                    <h2 className="mb-0 me-3">Предпросмотр</h2>

                    <Button
                        variant={annotationMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        className="me-2"
                        onClick={() => setAnnotation((v) => !v)}
                    >
                        <FaPencilAlt />
                    </Button>

                    <Button
                        variant={clozeMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        onClick={() => setClozeMode((v) => !v)}
                    >
                        <FaEye />
                    </Button>
                </Col>
            </Row>
            <hr className="m-0" />

            {/* Редактор + предпросмотр */}
            <Row className="mx-0 flex-grow-1" style={{ overflow: 'auto' }}>
                <Col md={6} className="p-0" style={{ borderRight: '1px solid #ccc' }}>
                    <CodeMirror
                        value={cardText}
                        theme={githubLight}
                        extensions={editorExtensions}
                        height="100%"
                        onChange={setCardText}
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
                            breaks
                        >
                            {processedText}
                        </ReactMarkdown>
                    </div>
                </Col>
            </Row>

            {/* Панель управления */}
            <Row className="mx-0" style={{ flexShrink: 0 }}>
                <Col
                    xs={12}
                    className="d-flex justify-content-between align-items-center p-3"
                    style={{ borderTop: '1px solid #ccc' }}
                >
                    <Button
                        variant={vimMode ? 'secondary' : 'outline-secondary'}
                        size="sm"
                        onClick={() => setVimMode((v) => !v)}
                    >
                        {vimMode ? 'Отключить Vim' : 'Включить Vim'}
                    </Button>

                    <div className="d-flex align-items-center">
                        {saveError && <span className="text-danger me-3">Ошибка: {saveError.message}</span>}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleAddCard}
                            disabled={saving}
                        >
                            {saving ? 'Сохраняю…' : 'Добавить карточку'}
                        </Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default AddCards;
