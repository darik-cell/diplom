import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Table, Form, Button, Spinner } from 'react-bootstrap';
import { useQuery, gql } from '@apollo/client';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

// --- GraphQL-запросы ---
const GET_COLLECTIONS = gql`
    query GetCollections($userId: ID!) {
        collectionsByUserId(userId: $userId) {
            id
            name
            countCards
            # createdAt можно добавить, если это поле есть
        }
    }
`;

const GET_CARDS_FOR_EDIT = gql`
    query GetCardsForEdit($collectionId: ID!) {
        cardsByCollectionId(collectionId: $collectionId) {
            id
            text
            createdAt
            collection {
                id
                name
            }
        }
    }
`;

// Функция для получения идентификатора пользователя.
// Если у вас уже есть реализация декодирования токена, можете использовать её.
// Здесь для примера просто используем localStorage.
function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        // Допустим, токен декодируется и даёт объект с полем id
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
    } catch (error) {
        console.error('Ошибка декодирования токена', error);
        return null;
    }
}

const EditPage = () => {
    const userId = getUserIdFromToken();
    const [activeCollectionId, setActiveCollectionId] = useState("1"); // открываем колоду с id=1 по умолчанию
    const [activeCard, setActiveCard] = useState(null);
    const [sortColumn, setSortColumn] = useState(null); // Возможные значения: "Колода", "Дата создания", "Текст"
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' или 'desc'
    const [searchFilter, setSearchFilter] = useState('');

    // --- Запрос списка колод пользователя ---
    const {
        loading: loadingCollections,
        error: errorCollections,
        data: dataCollections,
    } = useQuery(GET_COLLECTIONS, {
        variables: { userId },
        skip: !userId,
    });

    // --- Запрос карточек выбранной колоды ---
    const {
        loading: loadingCards,
        error: errorCards,
        data: dataCards,
        refetch: refetchCards,
    } = useQuery(GET_CARDS_FOR_EDIT, {
        variables: { collectionId: activeCollectionId },
        skip: !activeCollectionId,
    });

    // Сортировка списка колод по id (сравниваем как числа)
    const collections = useMemo(() => {
        if (!dataCollections || !dataCollections.collectionsByUserId) return [];
        return [...dataCollections.collectionsByUserId].sort(
            (a, b) => Number(a.id) - Number(b.id)
        );
    }, [dataCollections]);

    // Центр. колонка: фильтрация и сортировка карточек
    const processedCards = useMemo(() => {
        if (!dataCards || !dataCards.cardsByCollectionId) return [];
        let cards = dataCards.cardsByCollectionId;

        // Фильтрация по строке поиска (ищем в тексте, без учета регистра)
        if (searchFilter) {
            cards = cards.filter(card =>
                card.text.toLowerCase().includes(searchFilter.toLowerCase())
            );
        }

        // Сортировка по выбранному столбцу
        if (sortColumn) {
            cards.sort((a, b) => {
                let valA, valB;
                if (sortColumn === 'Колода') {
                    valA = a.collection?.name || '';
                    valB = b.collection?.name || '';
                } else if (sortColumn === 'Дата создания') {
                    valA = a.createdAt;
                    valB = b.createdAt;
                } else if (sortColumn === 'Текст') {
                    valA = a.text;
                    valB = b.text;
                }
                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return cards;
    }, [dataCards, searchFilter, sortColumn, sortOrder]);

    // Обработчик сортировки по клику на ячейку шапки таблицы
    const handleSort = (columnName) => {
        if (sortColumn === columnName) {
            // Если уже сортируем по этому столбцу, меняем порядок
            setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(columnName);
            setSortOrder('asc');
        }
    };

    // Обработка клика по колоде в левой колонке
    const handleCollectionClick = (collectionId) => {
        setActiveCollectionId(collectionId);
        setActiveCard(null);
        refetchCards();
    };

    // Клик по строке таблицы – выбор активной карточки
    const handleCardClick = (card) => {
        setActiveCard(card);
    };

    // Убрать активную карточку
    const handleClearActiveCard = () => {
        setActiveCard(null);
    };

    if (loadingCollections || loadingCards) {
        return (
            <Container className="mt-4">
                <Spinner animation="border" />
            </Container>
        );
    }
    if (errorCollections) {
        return (
            <Container className="mt-4">
                Ошибка загрузки колод: {errorCollections.message}
            </Container>
        );
    }
    if (errorCards) {
        return (
            <Container className="mt-4">
                Ошибка загрузки карточек: {errorCards.message}
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row>
                {/* Левая колонка: список колод */}
                <Col md={3}>
                    <h5>Колоды</h5>
                    <ul className="list-group">
                        {collections.map(col => (
                            <li
                                key={col.id}
                                className={`list-group-item ${col.id === activeCollectionId ? 'active' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleCollectionClick(col.id)}
                            >
                                {col.name} (ID: {col.id})
                            </li>
                        ))}
                    </ul>
                </Col>

                {/* Центральная колонка: строка поиска и таблица карточек */}
                <Col md={activeCard ? 6 : 9}>
                    <Form className="mb-3">
                        <Form.Control
                            type="text"
                            placeholder="Поиск..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                        />
                    </Form>

                    <Table bordered hover responsive>
                        <thead>
                        <tr>
                            <th
                                onClick={() => handleSort('Колода')}
                                style={{ cursor: 'pointer' }}
                            >
                                Колода
                            </th>
                            <th
                                onClick={() => handleSort('Дата создания')}
                                style={{ cursor: 'pointer' }}
                            >
                                Дата создания
                            </th>
                            <th
                                onClick={() => handleSort('Текст')}
                                style={{ cursor: 'pointer' }}
                            >
                                Текст
                            </th>
                            <th>Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {processedCards.map(card => (
                            <tr
                                key={card.id}
                                onClick={() => handleCardClick(card)}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>{card.collection?.name}</td>
                                <td>{new Date(card.createdAt).toLocaleString()}</td>
                                <td>
                                    {card.text.length > 50
                                        ? card.text.slice(0, 50) + '...'
                                        : card.text}
                                </td>
                                <td>
                                    <Button
                                        variant="info"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCardClick(card);
                                        }}
                                    >
                                        Просмотр
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                </Col>

                {/* Правая колонка: просмотр активной карточки (если выбрана) */}
                {activeCard && (
                    <Col md={3}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h5>Просмотр карточки</h5>
                            <Button variant="outline-danger" size="sm" onClick={handleClearActiveCard}>
                                ×
                            </Button>
                        </div>
                        <div
                            className="border p-2"
                            style={{ maxHeight: '400px', overflowY: 'auto' }}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeKatex, rehypeHighlight, rehypeRaw]}
                            >
                                {activeCard.text}
                            </ReactMarkdown>
                        </div>
                    </Col>
                )}
            </Row>
        </Container>
    );
};

export default EditPage;
