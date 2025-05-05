import React, { useState, useEffect, useCallback } from 'react';
import { Container, Button, Spinner } from 'react-bootstrap';
import { gql, useQuery } from '@apollo/client';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

// Импорт стилей для рендеринга markdown, формул и подсветки
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import 'github-markdown-css/github-markdown.css';

// GraphQL-запрос для получения карточек по collectionId
const GET_CARDS = gql`
    query GetCards($collectionId: ID!) {
        cardsByCollectionId(collectionId: $collectionId) {
            id
            text
        }
    }
`;

const RepeatCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_CARDS, {
        variables: { collectionId },
    });
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    // Состояния для отображаемого текста, сохранённых оригинальных значений и счётчика замен
    const [displayText, setDisplayText] = useState('');
    const [maskedValues, setMaskedValues] = useState([]); // Массив, где по порядку сохраняются оригинальные значения
    const [currentReplacementIndex, setCurrentReplacementIndex] = useState(0);

    /**
     * Обработка текста карточки:
     * - Ищет все вхождения вида ??<inp>?? и заменяет их на '[...]'
     * - Сохраняет все найденные фрагменты в массив для последующей замены
     */
    const processCardText = useCallback((text) => {
        const regex = /\?\?(.+?)\?\?/g;
        const maskedArr = [];
        // Заменяем найденные вхождения на '[...]' и сохраняем оригиналы в массив
        const prepText = text.replace(regex, (match, inp) => {
            maskedArr.push(inp);
            return '[...]';
        });
        return { prepText, maskedArr };
    }, []);

    // При смене карточки (или при загрузке данных) обрабатывается текст
    useEffect(() => {
        if (!loading && data) {
            const card = data.cardsByCollectionId[currentCardIndex];
            if (card) {
                const { prepText, maskedArr } = processCardText(card.text);
                setDisplayText(prepText);
                setMaskedValues(maskedArr);
                setCurrentReplacementIndex(0);
            }
        }
    }, [loading, data, currentCardIndex, processCardText]);

    /**
     * Обработчик нажатия клавиши Tab:
     * - Предотвращает стандартное поведение клавиши
     * - Заменяет первое найденное "[...]" в displayText на соответствующее значение из maskedValues
     */
    const handleTabPress = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (currentReplacementIndex < maskedValues.length) {
                const newText = displayText.replace('[...]', maskedValues[currentReplacementIndex]);
                setDisplayText(newText);
                setCurrentReplacementIndex(currentReplacementIndex + 1);
            }
        }
    };

    // Переход к следующей карточке
    const handleNextCard = () => {
        setCurrentCardIndex(prev => prev + 1);
    };

    const isFinished = !data || currentCardIndex >= data.cardsByCollectionId.length;

    if (loading) {
        return (
            <Container className="mt-4">
                <Spinner animation="border" />
            </Container>
        );
    }
    if (error) {
        return (
            <Container className="mt-4">
                Ошибка: {error.message}
            </Container>
        );
    }
    if (isFinished) {
        return (
            <Container className="mt-4" style={{ textAlign: 'center' }}>
                <h2>Ура! На сегодня все.</h2>
                <Link to="/">Вернуться на главную</Link>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <div>
                {/* Отображение подготовленного markdown-текста.
                    Элемент получает фокус (tabIndex=0) и прослушивает нажатия клавиш */}
                <div
                    className="mb-3 markdown-body prep-text"
                    tabIndex={0}
                    onKeyDown={handleTabPress}
                    style={{
                        border: '1px solid #ccc',
                        padding: '10px',
                        minHeight: '100px'
                    }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                    >
                        {displayText}
                    </ReactMarkdown>
                </div>
                <Button onClick={handleNextCard}>Следующая карточка</Button>
            </div>
        </Container>
    );
};

export default RepeatCards;


