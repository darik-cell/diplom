### apolloClient.js
```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Создаём http-ссылку на GraphQL endpoint
const httpLink = createHttpLink({
    uri: 'http://localhost:8080/graphql',
});

// Добавляем заголовок авторизации (если есть токен)
const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    };
});

// Создаём Apollo Client
const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});

export default client;
```

### App.css
```css
.App {
  text-align: center;
}

.App-logo {
  height: 40vmin;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  .App-logo {
    animation: App-logo-spin infinite 20s linear;
  }
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.App-link {
  color: #61dafb;
}

@keyframes App-logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

### App.jsx
```
import React from 'react';
import {Routes, Route, Navigate, Link, useNavigate} from 'react-router-dom';
import {Navbar, Container, Nav} from 'react-bootstrap';
import Login from './components/Login';
import Register from './components/Register';
import Main from './components/Main';
import AddCards from './components/AddCards';
import RepeatCards from './components/RepeatCards';
import EditPage from "./components/EditPage";

// Обёртка для приватных маршрутов (требуется токен)
const PrivateRoute = ({children}) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login"/>;
};

// Обёртка для публичных маршрутов (если пользователь уже авторизован, перенаправляем на главную)
const PublicRoute = ({children}) => {
    const token = localStorage.getItem('token');
    return token ? <Navigate to="/"/> : children;
};

const App = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
            <Navbar bg="primary" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand as={Link} to="/">Flashcards App</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="basic-navbar-nav">
                        {token ? (
                            <Nav className="ms-auto">
                                <Nav.Link onClick={handleLogout}>Выйти</Nav.Link>
                                <Nav.Link as={Link} to="/edit">Редактировать</Nav.Link>
                            </Nav>
                        ) : (
                            <Nav className="ms-auto">
                                <Nav.Link as={Link} to="/login">Вход</Nav.Link>
                                <Nav.Link as={Link} to="/register">Регистрация</Nav.Link>
                            </Nav>
                        )}
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <Container className="mt-4">
                            <PublicRoute>
                                <Login/>
                            </PublicRoute>
                        </Container>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <Container className="mt-4">
                            <PublicRoute>
                                <Register/>
                            </PublicRoute>
                        </Container>
                    }
                />
                <Route
                    path="/"
                    element={
                        <Container className="mt-4">
                            <PrivateRoute>
                                <Main/>
                            </PrivateRoute>
                        </Container>
                    }
                />
                <Route
                    path="/collection/:collectionId"
                    element={<AddCards/>}
                />
                <Route
                    path="/edit"
                    element={
                        <PrivateRoute>
                            <EditPage />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/repeat/:collectionId"
                    element={
                        <PrivateRoute>
                            <RepeatCards/>
                        </PrivateRoute>
                    }
                />
            </Routes>

        </>
    );
};

export default App;

```

### components\AddCards.jsx
```
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
```

### components\EditPage.jsx
```
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
```

### components\Login.jsx
```
import React, { useState } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                setMessage('Ошибка авторизации');
                return;
            }

            const data = await response.json();
            if (data.token) {
                localStorage.setItem('token', data.token);
                navigate('/');
            } else {
                setMessage('Неверные учетные данные');
            }
        } catch (error) {
            console.error('Ошибка авторизации', error);
            setMessage('Ошибка соединения');
        }
    };

    return (
        <Container>
            <h2>Вход</h2>
            {message && <Alert variant="danger">{message}</Alert>}
            <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3" controlId="loginEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Введите email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="loginPassword">
                    <Form.Label>Пароль</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </Form.Group>

                <Button variant="primary" type="submit">
                    Войти
                </Button>
            </Form>
        </Container>
    );
};

export default Login;
```

### components\Main.jsx
```
import React, {useState} from 'react';
import {Container, Button, Form, Spinner, Table} from 'react-bootstrap';
import {gql, useQuery, useMutation} from '@apollo/client';
import {useNavigate} from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import {Link} from 'react-router-dom';

function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const decoded = jwtDecode(token);
        return decoded.id; // предполагается, что в токене поле "id"
    } catch (error) {
        console.error('Ошибка декодирования токена', error);
        return null;
    }
}

const GET_COLLECTIONS = gql`
    query GetCollections($userId: ID!) {
        collectionsByUserId(userId: $userId) {
            id
            name
            countCards
        }
    }
`;

const SAVE_COLLECTION = gql`
    mutation SaveCollection($collection: CollectionInp!) {
        saveCollection(collection: $collection) {
            id
            name
        }
    }
`;

// Новая мутация для удаления коллекции
const DELETE_COLLECTION = gql`
    mutation DeleteCollection($id: ID!) {
        deleteCollection(id: $id)
    }
`;

const Main = () => {
    const userId = getUserIdFromToken();
    const navigate = useNavigate();

    const [newName, setNewName] = useState('');
    const [showCreateButton, setShowCreateButton] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState(null);

    const {loading, error, data, refetch} = useQuery(GET_COLLECTIONS, {
        variables: {userId},
        skip: !userId,
        // Можно добавить fetchPolicy: 'cache-and-network' для актуализации данных
    });

    const [saveCollection] = useMutation(SAVE_COLLECTION, {
        onCompleted: () => {
            setNewName('');
            setShowCreateButton(false);
            refetch();
        },
    });

    const [deleteCollection] = useMutation(DELETE_COLLECTION, {
        onCompleted: (data) => {
            // Если mutation вернула true, можно обновить список либо полность через refetch
            if (data.deleteCollection) {
                setCollectionToDelete(null);
                refetch();
            }
        },
    });

    const handleCreateCollection = () => {
        if (!newName.trim()) return;
        saveCollection({
            variables: {
                collection: {
                    name: newName,
                    user: {id: userId},
                },
            },
        });
    };

    const handleShowDelete = (id) => {
        setCollectionToDelete(id);
    };

    const handleConfirmDelete = (id) => {
        deleteCollection({
            variables: {id},
        });
    };

    const handleCancelDelete = () => {
        setCollectionToDelete(null);
    };

    // Переход на страницу добавления карточек
    const handleAddCards = (collectionId) => {
        navigate(`/collection/${collectionId}`);
    };

    if (!userId) {
        return <Container className="mt-4">Нет авторизации</Container>;
    }

    if (loading)
        return (
            <Container className="mt-4">
                <Spinner animation="border"/>
            </Container>
        );
    if (error)
        return <Container className="mt-4">Ошибка: {error.message}</Container>;

    return (
        <Container className="mt-4" style={{maxWidth: '66%'}}>
            <h2>Список коллекций пользователя</h2>

            <div className="p-3 mb-4 bg-white rounded shadow">
                <Table bordered hover responsive className="mb-0">
                    <thead>
                    <tr>
                        <th style={{width: '40%'}}>Коллекция</th>
                        <th>Всего карточек</th>
                        <th>Новые карточки</th>
                        <th>К просмотру</th>
                        <th>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.collectionsByUserId.map((col) => (
                        <tr key={col.id}>
                            <td>
                                <Link to={`/repeat/${col.id}`}>{col.name}</Link>
                            </td>
                            <td>{col.countCards}</td>
                            <td>
                                <span className="text-primary">0</span>
                            </td>
                            <td>
                                <span className="text-success">0</span>
                            </td>
                            <td>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleAddCards(col.id)}
                                    style={{marginRight: '5px'}}
                                >
                                    +
                                </Button>
                                {collectionToDelete !== col.id ? (
                                    <span
                                        style={{cursor: 'pointer', color: 'gray'}}
                                        onMouseEnter={(e) => (e.currentTarget.style.color = 'red')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = 'gray')}
                                        onClick={() => handleShowDelete(col.id)}
                                    >
                      🗑
                    </span>
                                ) : (
                                    <span>
                      Удалить?{' '}
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={() => handleConfirmDelete(col.id)}
                                        >
                        ✓
                      </Button>{' '}
                                        <Button variant="outline-danger" size="sm" onClick={handleCancelDelete}>
                        ×
                      </Button>
                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </div>

            <div style={{marginTop: '20px', position: 'relative', width: '300px'}}>
                <Form.Control
                    type="text"
                    placeholder="Новая коллекция"
                    value={newName}
                    onChange={(e) => {
                        setNewName(e.target.value);
                        setShowCreateButton(e.target.value.trim() !== '');
                    }}
                />
                {showCreateButton && newName.trim() && (
                    <Button
                        variant="success"
                        size="sm"
                        style={{position: 'absolute', right: '-50px', top: '0'}}
                        onClick={handleCreateCollection}
                    >
                        ✓
                    </Button>
                )}
            </div>
        </Container>
    );
};

export default Main;
```

### components\MarkdownHighlight.jsx
```
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
```

### components\Register.jsx
```
import React, { useState } from 'react';
import { Form, Button, Alert, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        // Проверка совпадения паролей
        if (password !== confirmPassword) {
            setMessage('Пароли не совпадают!');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.text();

            if (response.ok && data === 'User registered successfully!') {
                setMessage('Пользователь успешно зарегистрирован!');
                // Редирект на страницу входа через 2 секунды
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else if (data === 'Email is already taken!') {
                setMessage('Email уже используется!');
            } else {
                setMessage('Ошибка регистрации');
            }
        } catch (error) {
            console.error('Ошибка регистрации', error);
            setMessage('Ошибка соединения');
        }
    };

    return (
        <Container>
            <h2>Регистрация</h2>
            {message && <Alert variant="info">{message}</Alert>}
            <Form onSubmit={handleRegister}>
                <Form.Group className="mb-3" controlId="registerEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        placeholder="Введите email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerPassword">
                    <Form.Label>Пароль</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3" controlId="registerConfirmPassword">
                    <Form.Label>Подтверждение пароля</Form.Label>
                    <Form.Control
                        type="password"
                        placeholder="Подтвердите пароль"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </Form.Group>

                <Button variant="primary" type="submit">
                    Зарегистрироваться
                </Button>
            </Form>
        </Container>
    );
};

export default Register;
```

### components\RepeatCards.jsx
```
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


```

### index.css
```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.no-scrollbar {
  overflow: auto;
  scrollbar-width: none;        // Firefox
-ms-overflow-style: none;     // IE, Edge
}
.no-scrollbar::-webkit-scrollbar {
  width: 0;
  height: 0;
}
.katex-display {
  display: block !important;
  margin: 1em 0 !important;
}
```

### index.js
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import client from './apolloClient';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
        <ApolloProvider client={client}>
            <App />
        </ApolloProvider>
    </BrowserRouter>
);
```

### logo.svg
```
```

### utils\highlightLogic.js
```javascript
/**
 * Функция, которая ищет все вхождения ??...??
 * и заменяет их:
 *  - если isClozeView = false => <mark>...</mark>
 *  - если isClozeView = true  => <span class="cloze" data-cloze="Оригинал" data-ordinal="N">[...]</span>
 *
 * Оригинальное содержимое между ?? и ?? сохраняется в массив hiddenContents.
 *
 * @param {string} text - Исходный текст
 * @param {boolean} isClozeView - Флаг режима «глаз»
 * @param {Array} hiddenContents - Массив для хранения оригинальных значений
 * @returns {string} - Обработанный текст
 */
export function processMarkedText(text, isClozeView, hiddenContents = []) {
    const regex = /\?\?(.+?)\?\?/g; // ищем пары ?? ... ?? (не жадно)

    return text.replace(regex, (match, contentInside) => {
        // сохраняем оригинальное содержимое
        hiddenContents.push(contentInside);

        if (isClozeView) {
            // Режим «глаз» (cloze)
            return `[...]`;
        } else {
            // Обычный режим (<mark>)
            return `${contentInside}`;
        }
    });
}
```


- Надо чтобы RepeatCards.jsx получал карточки для повторения, сначала показывал новые карточки, после в порядке даты создания
- Надо добавить чтобы было 4 кнопки соответствующие ReviewAnswer, над каждой кнопкой отображался будущий интервал
- Отправлялись соответствующие запросы
