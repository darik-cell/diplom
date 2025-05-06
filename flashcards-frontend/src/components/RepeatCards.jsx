import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CardCounter from './CardCounter';
import { Container, Button, Spinner, Row, Col } from 'react-bootstrap';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useParams, Link } from 'react-router-dom';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import 'github-markdown-css/github-markdown.css';

import { processMarkedText } from '../utils/highlightLogic';

/* ---------- GraphQL ---------- */

const START_LEARNING = gql`
    query StartLearning($collectionId: ID!) {
        startLearning(collectionId: $collectionId) {
            id
            text
            queue
            stepsLeft
            createdAt
            newIntervals {
                answer
                interval
                unit
            }
        }
    }
`;

const REVIEW_CARD = gql`
    mutation ReviewCard($cardId: ID!, $answer: ReviewAnswer!) {
        reviewCard(cardId: $cardId, answer: $answer) {
            id
            queue
            newIntervals { answer interval unit }
        }
    }
`;

/* ---------- Component ---------- */

const RepeatCards = () => {
    const { collectionId } = useParams();

    /* --- Запрашиваем список карточек --- */
    const { loading, error, data, refetch } = useQuery(START_LEARNING, {
        variables: { collectionId },
        fetchPolicy: 'network-only',
    });

    /* --- Индекс текущей карточки --- */
    const [idx, setIdx] = useState(0);

    /* --- Мутация Review --- */
    const [reviewCard] = useMutation(REVIEW_CARD, {
        onCompleted: () => refetch().then(() => setIdx(0))
    });

    /* --- Сортировка карточек --- */
    const cards = useMemo(() => {
        if (!data?.startLearning) return [];
        return [...data.startLearning].sort((a, b) => {
            if (a.queue === 0 && b.queue !== 0) return -1;
            if (a.queue !== 0 && b.queue === 0) return 1;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }, [data]);

    const finished = !loading && cards.length === 0;

    /* --- Счётчик оставшихся --- */
    const remaining = useMemo(() => ({
        new: cards.filter(c => c.queue === 0).length,
        learning: cards.filter(c => c.queue === 1 || c.queue === 3).length,
        review: cards.filter(c => c.queue === 2).length,
    }), [cards]);

    /* ---- Интервалы для кнопок ---- */
    const intervals = useMemo(() => {
        const cur = cards[idx];
        if (!cur) return {};
        const map = {};
        cur.newIntervals.forEach(({ answer, interval, unit }) => {
            let label;
            if (unit === 'MIN') {
                label = interval === 0 ? '<1\u202Fмин' : `<${interval}\u202Fмин`;
            } else {
                label = `${interval}\u202Fдн`;
            }
            map[answer] = label;
        });
        return map;
    }, [cards, idx]);

    /* ---------- Cloze‑логика ---------- */
    const [displayText, setDisplayText] = useState('');
    const [hidden, setHidden] = useState([]);
    const [revealIdx, setRevealIdx] = useState(0);

    useEffect(() => {
        if (cards[idx]) {
            const buf = [];
            const processed = processMarkedText(cards[idx].text, true, buf);
            setDisplayText(processed);
            setHidden(buf);
            setRevealIdx(0);
        }
    }, [cards, idx]);

    const handleTab = useCallback((e) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        if (revealIdx >= hidden.length) return;
        setDisplayText(prev => prev.replace('[...]', hidden[revealIdx]));
        setRevealIdx(i => i + 1);
    }, [revealIdx, hidden]);

    /* ---------- Оценка ---------- */
    const answer = (ans) => {
        reviewCard({ variables: { cardId: cards[idx].id, answer: ans } });
    };

    /* ---------- UI ---------- */

    if (loading) return <Container className="mt-4"><Spinner /></Container>;
    if (error) return <Container className="mt-4">Ошибка: {error.message}</Container>;
    if (finished) return (
        <Container className="mt-4 text-center">
            <h2>Все карточки на сегодня пройдены 🎉</h2>
            <Link to="/">На главную</Link>
        </Container>
    );

    const current = cards[idx];

    return (
        <Container fluid className="d-flex flex-column flex-grow-1 p-0">
            <Row className="justify-content-center flex-grow-1 m-0">
                <Col md={8} className="d-flex flex-column p-0">

                    {/* --- Текст карточки --- */}
                    <div
                        className="markdown-body border p-3 mb-3 flex-grow-1"
                        style={{ overflow: 'auto' }}
                        tabIndex={0}
                        onKeyDown={handleTab}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                        >
                            {displayText}
                        </ReactMarkdown>
                    </div>

                    {/* --- Кнопки оценки --- */}
                    <div className="d-flex justify-content-between mt-auto mb-2 px-3">
                        {['AGAIN', 'HARD', 'GOOD', 'EASY'].map(k => (
                            <div key={k} className="text-center flex-fill mx-1">
                                <small className="text-muted">{intervals[k] || ''}</small>
                                <br />
                                <Button
                                    variant={
                                        k === 'AGAIN' ? 'danger' :
                                            k === 'HARD' ? 'warning' :
                                                k === 'GOOD' ? 'success' : 'primary'}
                                    size="sm"
                                    onClick={() => answer(k)}
                                    style={{ width: '100%' }}
                                >
                                    {k}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <CardCounter total={remaining} />

                    <div className="text-center mb-3">
                        <Button variant="outline-secondary" size="sm"
                                onClick={() => setIdx(i => (i + 1) % cards.length)}>
                            Пропустить
                        </Button>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default RepeatCards;
