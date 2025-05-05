// src/components/RepeatCards.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Container, Button, Spinner } from 'react-bootstrap';
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

import { processMarkedText } from '../utils/highlightLogic';   // ваша функция ??...??

/* ---------- GraphQL ---------- */

// Карточки, готовые к показу
const START_LEARNING = gql`
    query StartLearning($collectionId: ID!) {
        startLearning(collectionId: $collectionId) {
            id
            text
            queue
            createdAt
            newIntervals {
                answer
                interval
            }
        }
    }
`;

// Оценка карточки
const REVIEW_CARD = gql`
    mutation ReviewCard($cardId: ID!, $answer: ReviewAnswer!) {
        reviewCard(cardId: $cardId, answer: $answer) {
            id
            queue
            newIntervals { answer interval }
        }
    }
`;

/* ---------- Компонент ---------- */

const RepeatCards = () => {
    const { collectionId } = useParams();

    /* --- Запрашиваем список due‑карточек --- */
    const { loading, error, data, refetch } = useQuery(START_LEARNING, {
        variables: { collectionId }
    });

    /* --- Сохраняем индекс текущей карточки --- */
    const [idx, setIdx] = useState(0);

    /* --- Mutation для оценки --- */
    const [reviewCard] = useMutation(REVIEW_CARD, {
        onCompleted: () => {
            /* После ответа подтягиваем свежий список */
            refetch().then(() => setIdx(0));
        }
    });

    /* --- Отсортированный список: новые → старые --- */
    const cards = useMemo(() => {
        if (!data?.startLearning) return [];
        return [...data.startLearning].sort((a, b) => {
            if (a.queue === 0 && b.queue !== 0) return -1;
            if (a.queue !== 0 && b.queue === 0) return 1;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }, [data]);

    /* --- Если всё пройдено --- */
    const finished = !loading && cards.length === 0;

    /* ---------- Cloze‑логика (??...??) ---------- */
    const [displayText, setDisplayText]   = useState('');
    const [hidden, setHidden]             = useState([]);  // оригиналы
    const [revealIdx, setRevealIdx]       = useState(0);   // сколько уже раскрыто

    /* Пересчёт текста при смене карточки */
    useEffect(() => {
        if (cards[idx]) {
            const buf = [];
            const processed = processMarkedText(cards[idx].text, true, buf); // 'true' → заполняем [...] вместо текста
            setDisplayText(processed);
            setHidden(buf);
            setRevealIdx(0);
        }
    }, [cards, idx]);

    /* Tab → раскрываем следующий [...] */
    const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        if (revealIdx >= hidden.length) return;
        setDisplayText((prev) => prev.replace('[...]', hidden[revealIdx]));
        setRevealIdx((i) => i + 1);
    };

    /* ---------- Оценка карточки ---------- */
    const answer = (ans) => {
        reviewCard({ variables: { cardId: cards[idx].id, answer: ans } });
    };

    /* ---------- UI ---------- */

    if (loading) return <Container className="mt-4"><Spinner/></Container>;
    if (error)   return <Container className="mt-4">Ошибка: {error.message}</Container>;
    if (finished) return (
        <Container className="mt-4" style={{textAlign:'center'}}>
            <h2>Все карточки на сегодня пройдены 🎉</h2>
            <Link to="/">На главную</Link>
        </Container>
    );

    const current = cards[idx];
    const intervals = Object.fromEntries(current.newIntervals.map(i => [i.answer, i.interval]));

    return (
        <Container className="mt-4">

            {/* --- Текст карточки --- */}
            <div
                className="markdown-body border p-3 mb-3"
                style={{minHeight:'120px'}}
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
            <div className="d-flex justify-content-between mb-3">

                {['AGAIN','HARD','GOOD','EASY'].map((k) => (
                    <div key={k} className="text-center flex-fill mx-1">
                        <small className="text-muted">
                            {intervals[k] ?? '-'} дн
                        </small><br/>
                        <Button
                            variant={
                                k==='AGAIN' ? 'danger' :
                                    k==='HARD'  ? 'warning' :
                                        k==='GOOD'  ? 'success' : 'primary'}
                            size="sm"
                            onClick={() => answer(k)}
                            style={{width:'100%'}}
                        >
                            {k}
                        </Button>
                    </div>
                ))}

            </div>

            {/* --- Доп.кнопка «Пропустить» (по желанию) --- */}
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setIdx((i) => (i + 1) % cards.length)}
            >
                Пропустить
            </Button>

        </Container>
    );
};

export default RepeatCards;
