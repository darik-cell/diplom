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
            cardText.slice(0, idx) + '==' + text + '==' + cardText.slice(idx + text.length)
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
```

### components\CardCounter.jsx
```
import React from 'react';

const style = {
    fontSize: '1.2rem',
    fontWeight: 500,
};

export default function CardCounter({ total }) {
    /* <blue>0</blue> + <red>0</red> + <green>8</green> */
    return (
        <div className="text-center mt-3" style={style}>
            <span style={{ color: '#0d6efd' }}>{total.new}</span>
            {' + '}
            <span style={{ color: '#dc3545' }}>{total.learning}</span>
            {' + '}
            <span style={{ color: '#198754', textDecoration: 'underline' }}>{total.review}</span>
        </div>
    );
}
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
// src/components/Main.jsx
import React, { useState } from 'react';
import { Container, Button, Form, Spinner, Table } from 'react-bootstrap';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';

/* ---------- helpers ---------- */
function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        return jwtDecode(token).id;
    } catch (e) {
        console.error('jwt decode error', e);
        return null;
    }
}

/* ---------- GraphQL ---------- */
const GET_COLLECTIONS = gql`
    query GetCollections($userId: ID!) {
        collectionsByUserId(userId: $userId) {
            id
            name
            countCards       # общее
            newCount         # новые (queue = 0)
            learningCount    # learning / relearn
            reviewCount      # due review
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

const DELETE_COLLECTION = gql`
    mutation DeleteCollection($id: ID!) {
        deleteCollection(id: $id)
    }
`;

/* ---------- Component ---------- */
const Main = () => {
    const userId = getUserIdFromToken();
    const navigate = useNavigate();

    /* --- UI state --- */
    const [newName, setNewName] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState(null);

    /* --- Query --- */
    const {
        loading,
        error,
        data,
        refetch,
    } = useQuery(GET_COLLECTIONS, {
        variables: { userId },
        skip: !userId,
        fetchPolicy: 'network-only',        // ← всегда свежие цифры
    });

    /* --- Mutations --- */
    const [saveCollection]   = useMutation(SAVE_COLLECTION, { onCompleted: () => { setNewName(''); refetch(); } });
    const [deleteCollection] = useMutation(DELETE_COLLECTION, { onCompleted: () => { setCollectionToDelete(null); refetch(); } });

    /* --- callbacks --- */
    const handleCreate = () => {
        if (!newName.trim()) return;
        saveCollection({ variables: { collection: { name: newName, user: { id: userId } } } });
    };

    const handleAddCards = (id) => refetch().finally(() => navigate(`/collection/${id}`));

    /* ---------- render ---------- */
    if (!userId) return <Container className="mt-4">Нет авторизации</Container>;
    if (loading)  return <Container className="mt-4"><Spinner/></Container>;
    if (error)    return <Container className="mt-4">Ошибка: {error.message}</Container>;

    return (
        <Container className="mt-4" style={{ maxWidth: '66%' }}>
            <h2>Список коллекций пользователя</h2>

            <div className="p-3 mb-4 bg-white rounded shadow">
                <Table bordered hover responsive className="mb-0">
                    <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Коллекция</th>
                        <th>Всего</th>
                        <th>Новые</th>
                        <th>Learning</th>
                        <th>К повтор.</th>
                        <th>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.collectionsByUserId.map(col => (
                        <tr key={col.id}>
                            <td><Link to={`/repeat/${col.id}`}>{col.name}</Link></td>
                            <td>{col.countCards}</td>
                            <td><span className="text-primary">{col.newCount}</span></td>
                            <td><span className="text-warning">{col.learningCount}</span></td>
                            <td><span className="text-success">{col.reviewCount}</span></td>
                            <td>
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleAddCards(col.id)}
                                    style={{ marginRight: 5 }}
                                >
                                    +
                                </Button>
                                {collectionToDelete !== col.id ? (
                                    <span
                                        style={{ cursor: 'pointer', color: 'gray' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = 'red')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'gray')}
                                        onClick={() => setCollectionToDelete(col.id)}
                                    >
                      🗑
                    </span>
                                ) : (
                                    <span>
                      Удалить?{' '}
                                        <Button variant="outline-success" size="sm" onClick={() => deleteCollection({ variables: { id: col.id } })}>✓</Button>{' '}
                                        <Button variant="outline-danger" size="sm" onClick={() => setCollectionToDelete(null)}>×</Button>
                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </div>

            {/* строка создания новой колоды */}
            <div style={{ marginTop: 20, position: 'relative', width: 300 }}>
                <Form.Control
                    type="text"
                    placeholder="Новая коллекция"
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setShowCreate(e.target.value.trim() !== ''); }}
                />
                {showCreate && (
                    <Button
                        variant="success"
                        size="sm"
                        style={{ position: 'absolute', right: -50, top: 0 }}
                        onClick={handleCreate}
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

/* --- растягиваем корневой контейнер --- */
html, body, #root {
    height: 100%; /* занимает всю высоту окна */
}

#root {               /* превратим корень в колонку */
  display: flex;
  flex-direction: column;
}

code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.no-scrollbar {
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
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
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter>
        <ApolloProvider client={client}>
            <App />
        </ApolloProvider>
    </BrowserRouter>
);
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

### main\java\com\myapp\flashcards\config\GraphQLConfig.java
```java
package com.myapp.flashcards.config;

import com.myapp.flashcards.graphql.scalars.CustomLocalDateTimeCoercing;
import graphql.language.StringValue;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Configuration
public class GraphQLConfig {

  @Bean
  public GraphQLScalarType localDateTimeScalar() {
    return GraphQLScalarType.newScalar()
            .name("LocalDateTime")
            .description("Кастомный скаляр для LocalDateTime с форматом HH:mm dd.MM.yyyy")
            .coercing(new CustomLocalDateTimeCoercing())
            .build();
  }

  @Bean
  public RuntimeWiringConfigurer runtimeWiringConfigurer() {
    return builder -> builder.scalar(localDateTimeScalar());
  }
}
```

### main\java\com\myapp\flashcards\config\SecurityConfig.java
```java
package com.myapp.flashcards.config;

import com.myapp.flashcards.security.JwtAuthenticationFilter;
import com.myapp.flashcards.security.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.*;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  @Autowired
  private JwtAuthenticationFilter jwtAuthenticationFilter;

  @Autowired
  private CustomUserDetailsService userDetailsService;

  @Bean
  public AuthenticationManager authenticationManager(
          AuthenticationConfiguration authenticationConfiguration) throws Exception {
    return authenticationConfiguration.getAuthenticationManager();
  }

  @Bean
  public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(request -> {
          CorsConfiguration config = new CorsConfiguration();
          config.setAllowedOriginPatterns(Arrays.asList("*"));
          config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
          config.setAllowedHeaders(Arrays.asList("*"));
          config.setAllowCredentials(true);
          return config;
        }))
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/graphiql").permitAll()
                .anyRequest().permitAll()
        )
        .authenticationProvider(authenticationProvider())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public AuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();

    authProvider.setUserDetailsService(userDetailsService);
    authProvider.setPasswordEncoder(passwordEncoder());

    return authProvider;
  }
}
```

### main\java\com\myapp\flashcards\controller\AuthController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.AuthRequest;
import com.myapp.flashcards.dto.AuthResponse;
import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.mapper.UserMapper;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.repository.UserRepository;
import com.myapp.flashcards.security.JwtUtil;
import com.myapp.flashcards.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.*;
        import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthenticationManager authenticationManager;
  private final UserService userService;
  private final JwtUtil jwtUtil;

  @PostMapping("/register")
  public String register(@RequestBody RegisterRequest request) {
    if(userService.existsByEmail(request.getEmail())) {
      return "Email is already taken!";
    }
    userService.save(request);
    return "User registered successfully!";
  }

  @PostMapping("/login")
  public AuthResponse login(@RequestBody AuthRequest request) {
    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
    );
    User user = userService.getByEmail(request.getEmail())
            .orElseThrow(() -> new UsernameNotFoundException("User not found!"));
    String token = jwtUtil.generateJwtToken(user);
    return new AuthResponse(token);
  }
}
```

### main\java\com\myapp\flashcards\controller\CardController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.model.*;
import com.myapp.flashcards.service.CardService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.Set;

@Controller
@RequiredArgsConstructor
public class CardController {

  private final CardService cardService;

  @MutationMapping
  public Card saveCard(@Argument("card") CardInp cardInp) {
    return cardService.saveCard(cardInp);
  }

  @QueryMapping
  public Set<Card> cardsByCollectionId(@Argument Integer collectionId) {
    return cardService.getAllByCollectionId(collectionId);
  }

  @QueryMapping
  public Card card(@Argument Integer id) {
    return cardService.getCardById(id)
            .orElseThrow(() -> new RuntimeException("Card not found"));
  }
}
```

### main\java\com\myapp\flashcards\controller\CardReviewController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.NextInterval;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.service.CardReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class CardReviewController {

  private final CardReviewService reviewService;

  @QueryMapping
  public List<Card> startLearning(@Argument Integer collectionId) {
    return reviewService.startLearning(collectionId);
  }

  @MutationMapping
  public Card reviewCard(@Argument Integer cardId,
                         @Argument ReviewAnswer answer) {
    return reviewService.gradeCard(cardId, answer);
  }

  /**
   * Маппинг GraphQL поля Card.newIntervals → DTO NextInterval
   */
  @SchemaMapping(typeName = "Card", field = "newIntervals")
  public List<NextInterval> newIntervals(Card c) {
    return c.getNewIntervals().values().stream()
            .map(dto -> new NextInterval(dto.answer(), dto.interval(), dto.unit()))
            .toList();
  }
}
```

### main\java\com\myapp\flashcards\controller\CollectionController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.model.*;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.*;
import com.myapp.flashcards.service.CardService;
import com.myapp.flashcards.service.CollectionService;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.Parent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Controller
@RequiredArgsConstructor
public class CollectionController {

  private final CollectionService collectionService;
  private final CardService cardService;

  @MutationMapping
  public Collection saveCollection(@Argument("collection") CollectionInp collectionInp) {
    Collection saved = collectionService.saveCollection(collectionInp);
    return saved;
  }

  @MutationMapping
  public Boolean deleteCollection(@Argument("id") Integer id) {
    return collectionService.deleteCollectionById(id);
  }

  @QueryMapping
  public Collection collection(@Argument Integer id) {
    return collectionService.getCollectionById(id)
            .orElseThrow(() -> new RuntimeException("Collection not found"));
  }

  @QueryMapping
  public Set<Collection> collectionsByUserId(@Argument Integer userId) {
    return collectionService.getCollectionsByUserId(userId);
  }

  @SchemaMapping
  public Integer countCards(Collection collection) {
    return cardService.countByCollectionId(collection.getId());
  }

  @SchemaMapping(typeName = "Collection", field = "newCount")
  public Integer newCount(Collection collection) {
    return cardService.countNew(collection.getId());
  }

  @SchemaMapping(typeName = "Collection", field = "learningCount")
  public Integer learningCount(Collection collection) {
    return cardService.countLearning(collection.getId());
  }

  @SchemaMapping(typeName = "Collection", field = "reviewCount")
  public Integer reviewCount(Collection collection) {
    return cardService.countDueReview(collection.getId());
  }
}
```

### main\java\com\myapp\flashcards\controller\UserController.java
```java
package com.myapp.flashcards.controller;

import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @MutationMapping
  public User saveUser(@Argument("user") UserInp userInp) {
    return userService.save(userInp);
  }

  @QueryMapping
  public User user(@Argument Integer id) {
    return userService.getById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
  }
}
```

### main\java\com\myapp\flashcards\dto\AuthRequest.java
```java
package com.myapp.flashcards.dto;

import lombok.Data;

@Data
public class AuthRequest {
  private String email;
  private String password;
}
```

### main\java\com\myapp\flashcards\dto\AuthResponse.java
```java
package com.myapp.flashcards.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
  private String token;
}
```

### main\java\com\myapp\flashcards\dto\CardInp.java
```java
package com.myapp.flashcards.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CardInp {
  private Integer id;
  private String text;
  private Integer collectionId;
}
```

### main\java\com\myapp\flashcards\dto\CollectionInp.java
```java
package com.myapp.flashcards.dto;


import lombok.*;
import org.springframework.stereotype.Service;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class CollectionInp {
  private Integer id;
  private UserInp user;
  private String name;
  private Set<CardInp> cards;
}
```

### main\java\com\myapp\flashcards\dto\NextInterval.java
```java
package com.myapp.flashcards.dto;

import com.myapp.flashcards.model.IntervalUnit;
import com.myapp.flashcards.model.ReviewAnswer;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class NextInterval {
  private ReviewAnswer answer;
  private Integer interval;
  private IntervalUnit unit;
}
```

### main\java\com\myapp\flashcards\dto\NextIntervalDto.java
```java
package com.myapp.flashcards.dto;

import com.myapp.flashcards.model.IntervalUnit;
import com.myapp.flashcards.model.ReviewAnswer;

public record NextIntervalDto(ReviewAnswer answer, int interval, IntervalUnit unit) {}
```

### main\java\com\myapp\flashcards\dto\RegisterRequest.java
```java
package com.myapp.flashcards.dto;

import lombok.*;
import org.springframework.stereotype.Service;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
  private String email;
  private String password;
}
```

### main\java\com\myapp\flashcards\dto\UserInp.java
```java
package com.myapp.flashcards.dto;

import lombok.*;
import org.springframework.stereotype.Service;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserInp {
  private Integer id;
  private String email;
  private String password;
  private Set<CollectionInp> collections;
}
```

### main\java\com\myapp\flashcards\FlashcardsApplication.java
```java
package com.myapp.flashcards;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FlashcardsApplication {

  public static void main(String[] args) {
    SpringApplication.run(FlashcardsApplication.class, args);
  }

}
```

### main\java\com\myapp\flashcards\graphql\scalars\CustomLocalDateTimeCoercing.java
```java
package com.myapp.flashcards.graphql.scalars;

import graphql.GraphQLContext;
import graphql.language.StringValue;
import graphql.language.Value;
import graphql.execution.CoercedVariables;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import jakarta.validation.constraints.NotNull;
import org.springframework.lang.Nullable;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class CustomLocalDateTimeCoercing implements Coercing<LocalDateTime, String> {

  private static final DateTimeFormatter CUSTOM_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd.MM.yyyy");

  @Override
  public @Nullable String serialize(@NotNull Object dataFetcherResult,
                                    @NotNull GraphQLContext graphQLContext,
                                    @NotNull Locale locale) throws CoercingSerializeException {
    if (dataFetcherResult instanceof LocalDateTime) {
      return ((LocalDateTime) dataFetcherResult).format(CUSTOM_FORMATTER);
    }
    throw new CoercingSerializeException("Ожидался объект LocalDateTime.");
  }

  @Override
  public @Nullable LocalDateTime parseValue(@NotNull Object input,
                                            @NotNull GraphQLContext graphQLContext,
                                            @NotNull Locale locale) throws CoercingParseValueException {
    try {
      return LocalDateTime.parse(input.toString(), CUSTOM_FORMATTER);
    } catch (Exception e) {
      throw new CoercingParseValueException("Неверное значение LocalDateTime: " + input, e);
    }
  }

  @Override
  public @Nullable LocalDateTime parseLiteral(@NotNull Value<?> input,
                                              @NotNull CoercedVariables variables,
                                              @NotNull GraphQLContext graphQLContext,
                                              @NotNull Locale locale) throws CoercingParseLiteralException {
    if (input instanceof StringValue) {
      try {
        return LocalDateTime.parse(((StringValue) input).getValue(), CUSTOM_FORMATTER);
      } catch (Exception e) {
        throw new CoercingParseLiteralException("Неверное значение LocalDateTime.", e);
      }
    }
    throw new CoercingParseLiteralException("Ожидался тип StringValue.");
  }

  @Override
  public @NotNull Value<?> valueToLiteral(@NotNull Object input,
                                          @NotNull GraphQLContext graphQLContext,
                                          @NotNull Locale locale) {
    return StringValue.newStringValue(input.toString()).build();
  }
}
```

### main\java\com\myapp\flashcards\mapper\CardMapper.java
```java
package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.model.Card;
import org.mapstruct.Mapper;

import java.util.Set;

@Mapper(componentModel = "spring")
public interface CardMapper {

  Card toEntity(CardInp cardInp);
  CardInp toCardInp(Card card);

  Set<Card> toCardSet(Set<CardInp> cardInpSet);
  Set<CardInp> toCardInpSet(Set<Card> cardSet);
}
```

### main\java\com\myapp\flashcards\mapper\CollectionMapper.java
```java
package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.model.Collection;
import org.mapstruct.Mapper;

import java.util.Set;

@Mapper(componentModel = "spring", uses = {CardMapper.class})
public interface CollectionMapper {

  Collection toEntity(CollectionInp collectionInp);
  CollectionInp toCollectionInp(Collection collection);

  Set<Collection> toCollectionSet(Set<CollectionInp> collectionInpSet);
  Set<CollectionInp> toCollectionInpSet(Set<Collection> collectionSet);
}
```

### main\java\com\myapp\flashcards\mapper\UserMapper.java
```java
package com.myapp.flashcards.mapper;

import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {CollectionMapper.class})
public interface UserMapper {

  @Mapping(target = "collections", source = "collections")
  User toEntity(UserInp userInp);

  UserInp fromRegisterRequest(RegisterRequest registerRequest);

  @Mapping(target = "collections", source = "collections")
  UserInp toUserInp(User user);
}
```

### main\java\com\myapp\flashcards\model\Card.java
```java
package com.myapp.flashcards.model;

import com.myapp.flashcards.dto.NextIntervalDto;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "cards")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Card {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Integer id;

  @Column(nullable = false, length = 5000)
  @EqualsAndHashCode.Include
  private String text;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "collection_id", nullable = false)
  private Collection collection;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  @EqualsAndHashCode.Include
  private LocalDateTime createdAt;

  // --- SRS-поля ---
  @Column(nullable = false)
  private Integer type;

  @Column(nullable = false)
  private Integer queue;

  @Column(nullable = false)
  private Integer due;

  @Column(nullable = false)
  private Integer ivl;

  @Column(nullable = false)
  private Integer factor;

  @Column(nullable = false)
  private Integer reps;

  @Column(nullable = false)
  private Integer lapses;

  @Column(name = "steps_left", nullable = false)
  private Integer stepsLeft;

  @Transient
  private Map<ReviewAnswer, NextIntervalDto> newIntervals = new EnumMap<>(ReviewAnswer.class);

  public void setCollection(Collection collection) {
    this.collection = collection;
    if (collection != null && collection.getCards() != null) {
      collection.getCards().add(this);
    }
  }
}
```

### main\java\com\myapp\flashcards\model\Collection.java
```java
package com.myapp.flashcards.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "collections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Collection {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @EqualsAndHashCode.Include
  private Integer id;

  @Column(nullable = false)
  @EqualsAndHashCode.Include
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @OneToMany(mappedBy = "collection", fetch = FetchType.LAZY, cascade = { CascadeType.REMOVE }, orphanRemoval = true)
  private Set<Card> cards = new HashSet<>();

  @CreationTimestamp
  @Column(name = "created_at", updatable = false, nullable = false)
  private LocalDateTime createdAt;

  public void setCards(Set<Card> cards) {
    if (cards == null) this.cards = null;
    else {
      this.cards.clear();
      cards.forEach(c -> c.setCollection(this));
    }
  }
}
```

### main\java\com\myapp\flashcards\model\IntervalUnit.java
```java
package com.myapp.flashcards.model;

public enum IntervalUnit { MIN, DAY }
```

### main\java\com\myapp\flashcards\model\ReviewAnswer.java
```java
package com.myapp.flashcards.model;

public enum ReviewAnswer {
  AGAIN,   // lapse → перевод в relearning
  HARD,    // prevIvl * hardFactor
  GOOD,    // (prevIvl + delay/2) * ease
  EASY     // (prevIvl + delay) * ease * easyBonus
}
```

### main\java\com\myapp\flashcards\model\User.java
```java
package com.myapp.flashcards.model;

import jakarta.persistence.*;
        import lombok.*;
import org.aspectj.weaver.patterns.TypePatternQuestions;

import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Column(unique = true, nullable = false)
  private String email;

  @Column(nullable = false)
  private String password;

  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
  private Set<Collection> collections;
}
```

### main\java\com\myapp\flashcards\repository\CardRepository.java
```java
package com.myapp.flashcards.repository;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Card;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface CardRepository extends JpaRepository<Card, Integer> {
  Set<Card> findAllByCollectionId(Integer collectionId, Sort sort);

  Integer countByCollectionId(Integer collectionId);


  /* новые (queue = 0) */
  int countByCollectionIdAndQueue(Integer collectionId, int queue);

  /* learning  (queue = 1)  + relearn (queue = 3) */
  @Query("SELECT COUNT(c) FROM Card c WHERE c.collection.id = :cid AND c.queue IN (1,3)")
  int countLearning(@Param("cid") Integer collectionId);

  /* review‑карты, у которых dueDay ≤ :today */
  @Query("""
          SELECT COUNT(c) FROM Card c
          WHERE c.collection.id = :cid
            AND c.queue = 2
            AND c.due <= :today
          """)
  int countDueReview(@Param("cid") Integer collectionId,
                     @Param("today") int todayInDays);
}
```

### main\java\com\myapp\flashcards\repository\CardReviewHistoryRepository.java
```java
package com.myapp.flashcards.repository;

public interface CardReviewHistoryRepository {
}
```

### main\java\com\myapp\flashcards\repository\CollectionRepository.java
```java
package com.myapp.flashcards.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.Collection;

import java.util.Optional;
import java.util.List;
import java.util.Set;

public interface CollectionRepository extends JpaRepository<Collection, Integer> {
  Set<Collection> findAllByUserId(Integer userId);
}
```

### main\java\com\myapp\flashcards\repository\UserRepository.java
```java
package com.myapp.flashcards.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.myapp.flashcards.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {
  Optional<User> findByEmail(String email);
  Boolean existsByEmail(String email);
}
```

### main\java\com\myapp\flashcards\security\CustomUserDetails.java
```java
package com.myapp.flashcards.security;

import com.myapp.flashcards.model.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

@Getter
public class CustomUserDetails implements UserDetails {

  private final User user;

  public CustomUserDetails(User user) {
    this.user = user;
  }


  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return null;
  }

  @Override
  public String getPassword() {
    return user.getPassword();
  }

  @Override
  public String getUsername() {
    return user.getEmail();
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }

}
```

### main\java\com\myapp\flashcards\security\CustomUserDetailsService.java
```java
package com.myapp.flashcards.security;

import com.myapp.flashcards.model.User;
import com.myapp.flashcards.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.*;
        import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  @Override
  public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
    User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User Not Found with email: " + email));

    return new CustomUserDetails(user);
  }
}
```

### main\java\com\myapp\flashcards\security\JwtAuthenticationFilter.java
```java
package com.myapp.flashcards.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.myapp.flashcards.model.User;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtUtil jwtUtil;
  private final UserDetailsService customUserDetailsService;

  @Override
  protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
    String jwt = parseJwt(request);
    if (jwt != null && jwtUtil.validateJwtToken(jwt)) {
      String email = jwtUtil.getEmailFromJwtToken(jwt);

      UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
      UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
              userDetails, null, null);
      authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

      SecurityContextHolder.getContext().setAuthentication(authentication);
    }
    filterChain.doFilter(request, response);
  }

  private String parseJwt(HttpServletRequest request) {
    String headerAuth = request.getHeader("Authorization");
    if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
      return headerAuth.substring(7);
    }
    return null;
  }
}
```

### main\java\com\myapp\flashcards\security\JwtUtil.java
```java
package com.myapp.flashcards.security;

import com.myapp.flashcards.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

  private final SecretKey jwtSecret;
  private final long jwtExpirationMs;

  public JwtUtil(@Value("${jwt.secret}") String secret, @Value("${jwt.expirationMs}") long expirationMs) {
    this.jwtSecret = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
    this.jwtExpirationMs = expirationMs;
  }

  public String generateJwtToken(User user) {
    return Jwts.builder()
            .setSubject(user.getEmail())
            .claim("id", user.getId())  // добавляем userId в claims
            .setIssuedAt(new Date())
            .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
            .signWith(jwtSecret, SignatureAlgorithm.HS512)
            .compact();
  }

  public String getEmailFromJwtToken(String token) {
    return Jwts.parserBuilder()
            .setSigningKey(jwtSecret)
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
  }

  public boolean validateJwtToken(String authToken) {
    try {
      Jwts.parserBuilder()
              .setSigningKey(jwtSecret)
              .build()
              .parseClaimsJws(authToken);
      return true;
    } catch (JwtException e) {
      System.out.println("Ошибка при валидации JWT токена: " + e.getMessage());
    }
    return false;
  }
}
```

### main\java\com\myapp\flashcards\service\CardReviewService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.srs.DefaultSrsService;
import com.myapp.flashcards.srs.SrsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CardReviewService {

  private final SrsService srsService;
  private final CardService cardService;
  private final CardRepository cardRepository;

  /**
   * Возвращает карточки, готовые к показу,
   * предварительно переводя новые (queue=0) в learning.
   */
  public List<Card> startLearning(Integer collectionId) {

    List<Card> due = srsService.getDueCards(collectionId, LocalDate.now());

    // 1. Новые → learning + немедленно сохраняем
    for (Card card : due) {
      if (card.getQueue() == 0) {
        srsService.initializeLearning(card);
        cardRepository.save(card);           // flush в БД, чтобы queue = 1
      }
    }

    // 2. Рассчитываем интервалы после перевода
    ((DefaultSrsService) srsService).attachPreviewIntervals(due);

    // 3. Сортировка: сначала те, что были new (теперь queue=1), потом по createdAt
    return due.stream()
            .sorted(Comparator
                    .comparing(Card::getQueue)          // 1 → первых
                    .thenComparing(Card::getCreatedAt))
            .toList();
  }

  public Card gradeCard(Integer cardId, ReviewAnswer answer) {
    Card card = cardService.getCardById(cardId)
            .orElseThrow(() -> new RuntimeException("Card not found"));
    srsService.processReview(card, answer);
    return card;
  }
}
```

### main\java\com\myapp\flashcards\service\CardService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CardInp;
import com.myapp.flashcards.mapper.CardMapper;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CardService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;
  private final CardMapper cardMapper;

  public Card saveCard(CardInp cardInp) {
    Card card = cardMapper.toEntity(cardInp);
    if (card.getId() != null) {
      // обновление текстового поля, как было
      Card exist = cardRepository.findById(card.getId())
              .orElseThrow(() -> new RuntimeException("Card not found"));
      if (!exist.getText().equals(card.getText())) {
        exist.setText(card.getText());
      }
      return cardRepository.save(exist);
    }
    // создание новой карты
    Collection coll = collectionRepository.findById(cardInp.getCollectionId())
            .orElseThrow(() -> new RuntimeException("Collection not found"));
    card.setCollection(coll);

    // инициализация SRS-параметров по умолчанию (как в Anki)
    card.setType(0);
    card.setQueue(0);
    card.setDue(0);
    card.setIvl(0);
    card.setFactor(2500);
    card.setReps(0);
    card.setLapses(0);
    card.setStepsLeft(2);  // количество learning-шагов по умолчанию

    return cardRepository.save(card);
  }

  public Optional<Card> getCardById(int id) {
    return cardRepository.findById(id);
  }

  public Set<Card> getAllByCollectionId(Integer collectionId) {
    return cardRepository.findAllByCollectionId(collectionId, Sort.by("createdAt"));
  }

  public Integer countByCollectionId(Integer collectionId) {
    return cardRepository.countByCollectionId(collectionId);
  }

  public int countNew(Integer collId) {
      return cardRepository.countByCollectionIdAndQueue(collId, 0);
  }

  public int countLearning(Integer collId) {
      return cardRepository.countLearning(collId);
  }

  public int countDueReview(Integer collId) {
      Collection coll = collectionRepository.findById(collId)
               .orElseThrow(() -> new RuntimeException("Collection not found"));
      int today = (int) ChronoUnit.DAYS.between(
              coll.getCreatedAt().toLocalDate(), LocalDate.now());
      return cardRepository.countDueReview(collId, today);
  }
}
```

### main\java\com\myapp\flashcards\service\CollectionService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.CollectionInp;
import com.myapp.flashcards.mapper.CollectionMapper;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.repository.CollectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CollectionService {

  private final CollectionRepository collectionRepository;
  private final CollectionMapper collectionMapper;
  private final UserService userService;

  public Collection saveCollection(CollectionInp collectionInp) {
    Collection collection = collectionMapper.toEntity(collectionInp);
    if (collection.getId() != null) {
      Collection existingCollection = collectionRepository.findById(collection.getId())
                      .orElseThrow(() -> new RuntimeException("Collection not found"));
      if (collection.getCards() != null) existingCollection.setCards(collection.getCards());
      if (collection.getName() != null) existingCollection.setName(collection.getName());
      return collectionRepository.save(existingCollection);
    }
    else {
      if (collection.getUser() != null) collection.setUser(userService.getById(collection.getUser().getId())
              .orElseThrow(() -> new RuntimeException("User not found")));
      return collectionRepository.save(collection);
    }
  }

  public Set<Collection> getCollectionsByUserId(Integer userId) {
    return collectionRepository.findAllByUserId(userId);
  }

  public Optional<Collection> getCollectionById(Integer collectionId) {
    return collectionRepository.findById(collectionId);
  }

  public Boolean deleteCollectionById(Integer collectionId) {
    collectionRepository.deleteById(collectionId);
    return !collectionRepository.existsById(collectionId);
  }

}
```

### main\java\com\myapp\flashcards\service\UserService.java
```java
package com.myapp.flashcards.service;

import com.myapp.flashcards.dto.RegisterRequest;
import com.myapp.flashcards.dto.UserInp;
import com.myapp.flashcards.mapper.UserMapper;
import com.myapp.flashcards.model.User;
import com.myapp.flashcards.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final PasswordEncoder passwordEncoder;

  public User save(UserInp userInp) {
    User user = userMapper.toEntity(userInp);
    if (user.getPassword() != null) {
      user.setPassword(passwordEncoder.encode(user.getPassword()));
    }
    user.setCollections(null);

    return userRepository.save(user);
  }

  public User save(RegisterRequest registerRequest) {
    UserInp user = userMapper.fromRegisterRequest(registerRequest);
    return save(user);
  }

  public boolean existsByEmail(String email) {
    return userRepository.existsByEmail(email);
  }

  public Optional<User> getById(Integer id) {
    return userRepository.findById(id);
  }

  public Optional<User> getByEmail(String email) {
    return userRepository.findByEmail(email);
  }
}
```

### main\java\com\myapp\flashcards\srs\DefaultSrsService.java
```java
package com.myapp.flashcards.srs;

import com.myapp.flashcards.dto.NextIntervalDto;
import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.Collection;
import com.myapp.flashcards.model.IntervalUnit;
import com.myapp.flashcards.model.ReviewAnswer;
import com.myapp.flashcards.repository.CardRepository;
import com.myapp.flashcards.repository.CollectionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.myapp.flashcards.model.IntervalUnit.DAY;
import static com.myapp.flashcards.model.IntervalUnit.MIN;
import static com.myapp.flashcards.model.ReviewAnswer.*;

@Service
@RequiredArgsConstructor
public class DefaultSrsService implements SrsService {

  private final CardRepository cardRepository;
  private final CollectionRepository collectionRepository;

  @Override
  public void initializeLearning(Card card) {
    // Перевод новой карточки в фазу Learning
    card.setType(1);   // 1 = learning
    card.setQueue(1);  // 1 = learn

    card.setStepsLeft(SrsConfig.LEARNING_STEPS_MIN.length);
    card.setDue((int) (Instant.now().getEpochSecond() +
            SrsConfig.LEARNING_STEPS_MIN[0] * 60));
  }


  @Override
  @Transactional
  public void processReview(Card card, ReviewAnswer quality) {

    /* -------------------------------------------------
       0. Общие данные
       ------------------------------------------------- */
    long nowSec = Instant.now().getEpochSecond();
    LocalDate createdDate = card.getCreatedAt().toLocalDate();
    int daysFromCreation = (int) ChronoUnit.DAYS.between(createdDate, LocalDate.now());

    /* -------------------------------------------------
       1. Learning / Relearning
       ------------------------------------------------- */
    if (card.getQueue() == 1 || card.getQueue() == 3) {

      // индекс текущего шага: 0 … (n‑1)
      int stepIdx = SrsConfig.LEARNING_STEPS_MIN.length - card.getStepsLeft();

      switch (quality) {

        /* ----- Again ― начать с нуля ----- */
        case AGAIN -> {
          card.setLapses(card.getLapses() + 1);
          card.setStepsLeft(SrsConfig.LEARNING_STEPS_MIN.length);
          card.setDue((int) (nowSec + SrsConfig.LEARNING_STEPS_MIN[0] * 60));
        }

        /* ----- Hard ― повторить тот же шаг еще раз ----- */
        case HARD -> {
          // Anki: Hard = текущий шаг × HARD_FACTOR
          int delayMin = (int) Math.round(
                  SrsConfig.LEARNING_STEPS_MIN[stepIdx] * SrsConfig.HARD_FACTOR);
          card.setDue((int) (nowSec + delayMin * 60));
          // stepsLeft НЕ уменьшаем
        }

        /* ----- Good / Easy ----- */
        case GOOD, EASY -> {
          int remaining = card.getStepsLeft() - (quality == ReviewAnswer.GOOD ? 1 : card.getStepsLeft());

          /* 2.1 Ещё остались learning‑шаги */
          if (remaining > 0) {
            card.setStepsLeft(remaining);
            int nextIdx = SrsConfig.LEARNING_STEPS_MIN.length - remaining;
            card.setDue((int) (nowSec + SrsConfig.LEARNING_STEPS_MIN[nextIdx] * 60));
          }
          /* 2.2 stepsLeft == 0  → выпуск в review */
          else {
            card.setStepsLeft(0);
            card.setType(2);                        // review
            card.setQueue(2);

            int gradIvl = (quality == EASY)
                    ? SrsConfig.EASY_GRADUATING_IVL   // 4 дня
                    : 1;                              // Good → 1 день

            card.setIvl(gradIvl);
            card.setReps(card.getReps() + 1);
            card.setDue(daysFromCreation + gradIvl);
          }
        }
      }
      return;      // learning‑ветка завершена
    }

    /* -------------------------------------------------
       3. Review‑карты
       ------------------------------------------------- */
    if (card.getQueue() == 2) {

      /* 3.1 Повтор с ошибкой → Relearning */
      if (quality == AGAIN) {
        card.setLapses(card.getLapses() + 1);
        card.setType(1);               // learning
        card.setQueue(3);              // relearn
        card.setStepsLeft(SrsConfig.LEARNING_STEPS_MIN.length);
        card.setDue((int) (nowSec + SrsConfig.LEARNING_STEPS_MIN[0] * 60));
        return;
      }

      /* 3.2 Корректный ответ → новый интервал */
      int prevIvl = card.getIvl();
      int delay = calculateDelay(card);
      int newIvl = calculateNextInterval(prevIvl, quality, delay, card.getFactor());
      newIvl = constrainInterval(newIvl);

      //‑‑‑ обновляем метрики
      card.setIvl(newIvl);
      card.setReps(card.getReps() + 1);

      switch (quality) {
        case HARD -> {
          int decreased = card.getFactor() - SrsConfig.HARD_FACTOR_DECREASE;
          card.setFactor(Math.max(decreased, SrsConfig.MIN_FACTOR));
        }
        case EASY -> {
          int increased = (int) (card.getFactor() * SrsConfig.EASY_BONUS);
          card.setFactor(increased);
        }
      }

      //‑‑‑ планируем следующий показ
      card.setDue(daysFromCreation + newIvl);
    }
  }

  /**
   * Возвращает все карточки из заданной коллекции, которым пора быть показанными.
   */
  @Override
  public List<Card> getDueCards(Integer collectionId, LocalDate today) {
    // 1. Находим коллекцию, чтобы взять её дату создания
    Collection coll = collectionRepository.findById(collectionId)
            .orElseThrow(() -> new RuntimeException("Collection not found"));
    LocalDate colCreatedDate = coll.getCreatedAt().toLocalDate();

    long nowSec = Instant.now().getEpochSecond();
    int daysSinceCreation = (int) ChronoUnit.DAYS.between(colCreatedDate, today);

    // 2. Берём все карты этой коллекции
    return cardRepository.findAllByCollectionId(collectionId, Sort.by("id")).stream()
            .filter(c -> {
              switch (c.getQueue()) {
                case 0: // new
                  return true;
                case 1: // learning
                case 3: // relearn
                  // due — это UNIX-метка для intraday
                  return true;
                case 2: // review
                  // due — это день от создания коллекции
                  return c.getDue() <= daysSinceCreation;
                default:
                  return false;
              }
            })
            .collect(Collectors.toList());
  }

  // --- вспомогательные методы ---

  /**
   * Сколько дней просрочено: текущий день – день, сохранённый в due.
   */
  private int calculateDelay(Card card) {
    LocalDate created = card.getCreatedAt().toLocalDate();
    int daysElapsed = (int) ChronoUnit.DAYS.between(created, LocalDate.now());
    return daysElapsed - card.getDue();
  }

  /**
   * Формула расчёта следующего интервала в днях (без ограничений):
   * HARD = prevIvl * hardFactor
   * GOOD = (prevIvl + delay/2) * ease
   * EASY = (prevIvl + delay) * ease * easyBonus
   */
  private int calculateNextInterval(int prevIvl,
                                    ReviewAnswer quality,
                                    int delay,
                                    int factorPermille) {
    double ease = factorPermille / 1000.0;
    switch (quality) {
      case HARD:
        return (int) (prevIvl * SrsConfig.HARD_FACTOR);
      case GOOD:
        return (int) ((prevIvl + delay / 2.0) * ease);
      case EASY:
        return (int) ((prevIvl + delay) * ease * SrsConfig.EASY_BONUS);
      default:
        throw new IllegalArgumentException("Unexpected quality: " + quality);
    }
  }

  /**
   * Приводим интервал к диапазону [MIN_INTERVAL; MAX_INTERVAL]
   */
  private int constrainInterval(int interval) {
    if (interval < SrsConfig.MIN_INTERVAL) {
      return SrsConfig.MIN_INTERVAL;
    }
    if (interval > SrsConfig.MAX_INTERVAL) {
      return SrsConfig.MAX_INTERVAL;
    }
    return interval;
  }

  /**
   * Предварительно рассчитывает интервалы для всех вариантов ответа.
   */
  public Map<ReviewAnswer, NextIntervalDto> previewIntervals(Card card) {

    Map<ReviewAnswer, NextIntervalDto> m = new EnumMap<>(ReviewAnswer.class);

    /* -------- Learning / Relearning -------- */
    if (card.getQueue() == 1 || card.getQueue() == 3 || card.getQueue() == 0) {

      int left = card.getStepsLeft();                 // 2 или 1
      // «<1 мин» для Again всегда одинаково
      m.put(AGAIN, new NextIntervalDto(AGAIN, 0, MIN));

      if (left == 2) {          // первый learning‑шаг
        m.put(HARD, new NextIntervalDto(HARD, 6, MIN)); // «<6 мин»
        m.put(GOOD, new NextIntervalDto(GOOD, 10, MIN)); // «<10 мин»
      } else {                  // left == 1 — последний learning‑шаг
        m.put(HARD, new NextIntervalDto(HARD, 10, MIN)); // «<10 мин»
        m.put(GOOD, new NextIntervalDto(GOOD, 1, DAY)); // «1 дн»
      }
      m.put(EASY, new NextIntervalDto(EASY, 2, DAY));      // «2 дн»
      return m;
    }

    /* -------- Review -------- */
    int prevIvl = card.getIvl();
    int delay = calculateDelay(card);
    int ef = card.getFactor();
    m.put(AGAIN, new NextIntervalDto(AGAIN, 10, MIN));

    m.put(HARD, new NextIntervalDto(HARD,
            constrainInterval((int) (prevIvl * SrsConfig.HARD_FACTOR)), DAY));

    m.put(GOOD, new NextIntervalDto(GOOD,
            constrainInterval((int) ((prevIvl + delay / 2.0) * ef / 1000.0)), DAY));

    m.put(EASY, new NextIntervalDto(EASY,
            constrainInterval((int) ((prevIvl + delay) * ef / 1000.0 * SrsConfig.EASY_BONUS)), DAY));

    return m;
  }

  /**
   * Заполняет поле newIntervals у каждой карточки.
   */
  public void attachPreviewIntervals(List<Card> cards) {
    cards.forEach(c -> c.setNewIntervals(previewIntervals(c)));
  }
}
```

### main\java\com\myapp\flashcards\srs\SrsConfig.java
```java
package com.myapp.flashcards.srs;

public class SrsConfig {
  public static final double HARD_FACTOR = 1.2;
  public static final double EASY_BONUS = 1.3;
  public static final int MIN_INTERVAL = 1;    // день
  public static final int MAX_INTERVAL = 365;  // дней
  public static final int INITIAL_FACTOR = 2500; // promille = 2.5
  public static final int INITIAL_STEPS = 2;    // default learning steps
  public static final int MIN_FACTOR = 1300;  // минимум для ease-фактора
  public static final int HARD_FACTOR_DECREASE = 150;   // насколько понижаем (в промилле)
  public static final int AGAIN_DELAY_SEC = 0; // сразу
  public static final int HARD_DELAY_MIN = 600; // 10 минут
  public static final int GOOD_DELAY_MIN = 600; // 10 минут
  public static final int EASY_GRADUATING_IVL = 4; // 4 дня, как в Anki
  public static final int[] LEARNING_STEPS_MIN = {1, 10}; // пример: 1 мин и 10 мин
}
```

### main\java\com\myapp\flashcards\srs\SrsService.java
```java
package com.myapp.flashcards.srs;

import com.myapp.flashcards.model.Card;
import com.myapp.flashcards.model.ReviewAnswer;

import java.time.LocalDate;
import java.util.List;

public interface SrsService {
  /**
   * Инициализирует SRS-поля при первом показе новой карточки.
   * Переводит её в очередь learning, выставляет due и stepsLeft.
   */
  void initializeLearning(Card card);

  /**
   * Обрабатывает нажатие кнопки оценки (Again/Hard/Good/Easy).
   * Пересчитывает ivl, factor, reps, lapses, due, queue, stepsLeft.
   */
  void processReview(Card card, ReviewAnswer quality);

  /**
   * Возвращает список карточек, которые сегодня надо показать:
   * – все новые (queue=new),
   * – все learning/relearning с due ≤ now,
   * – все review с dueDay ≤ today.
   */
  List<Card> getDueCards(Integer collectionId, LocalDate today);
}

```

### main\resources\application.yaml
```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${POSTGRES_DATABASE}?currentSchema=${POSTGRES_SCHEMA}
    username: ${POSTGRES_USERNAME}
    password: ${POSTGRES_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: none
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    properties:
      hibernate:
        show_sql: true
        format_sql: true
#    open-in-view: false
  liquibase:
    change-log: classpath:db.changelog-master.xml
    default-schema: flashcards
  config:
    import: optional:file:.env[.properties]
  graphql:
    graphiql:
      enabled: true

jwt:
  secret: ${JWT_SECRET}
  expirationMs: 86400000
```

### main\resources\db\changelog\v.1.0.0_initial-schema\01-changeset-users-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="1" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="01-create-users-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
        <rollback>
            <sqlFile path="01-drop-users-table.sql"
                     dbms="postgresql"
                     encoding="utf8"
                     relativeToChangelogFile="true"
                     splitStatements="true"
                     stripComments="true"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### main\resources\db\changelog\v.1.0.0_initial-schema\01-create-users-table.sql
```sql
-- Таблица пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### main\resources\db\changelog\v.1.0.0_initial-schema\01-drop-users-table.sql
```sql
DROP TABLE users;
```

### main\resources\db\changelog\v.1.0.0_initial-schema\10-changeset-collections-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="2" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="10-create-collections-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
        <rollback>
            <sqlFile path="10-drop-collections-table.sql"
                     dbms="postgresql"
                     encoding="utf8"
                     relativeToChangelogFile="true"
                     splitStatements="true"
                     stripComments="true"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### main\resources\db\changelog\v.1.0.0_initial-schema\10-create-collections-table.sql
```sql
-- Таблица коллекций
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### main\resources\db\changelog\v.1.0.0_initial-schema\10-drop-collections-table.sql
```sql
DROP TABLE collections;
```

### main\resources\db\changelog\v.1.0.0_initial-schema\20-changeset-cards-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="3" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="20-create-cards-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
        <rollback>
            <sqlFile path="20-drop-cards-table.sql"
                     dbms="postgresql"
                     encoding="utf8"
                     relativeToChangelogFile="true"
                     splitStatements="true"
                     stripComments="true"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

### main\resources\db\changelog\v.1.0.0_initial-schema\20-create-cards-table.sql
```sql
CREATE TABLE cards
(
    id            SERIAL PRIMARY KEY,
    text          TEXT      NOT NULL,
    collection_id BIGINT    NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- поля SRS с дефолтами, как в Anki
    type          INTEGER   NOT NULL DEFAULT 0,    -- 0=new
    queue         INTEGER   NOT NULL DEFAULT 0,    -- 0=new
    due           INTEGER   NOT NULL DEFAULT 0,    -- для new = 0
    ivl           INTEGER   NOT NULL DEFAULT 0,    -- в днях
    factor        INTEGER   NOT NULL DEFAULT 2500, -- ease-factor = 2.5
    reps          INTEGER   NOT NULL DEFAULT 0,
    lapses        INTEGER   NOT NULL DEFAULT 0,
    steps_left    INTEGER   NOT NULL DEFAULT 2     -- default learning steps = 2
);
```

### main\resources\db\changelog\v.1.0.0_initial-schema\20-drop-cards-table.sql
```sql
DROP TABLE cards;
```

### main\resources\db\changelog\v.1.0.0_initial-schema\30-changeset-repetitions-table.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="4" author="alyosander">
        <sqlFile dbms="postgresql"
                 encoding="utf8"
                 relativeToChangelogFile="true"
                 path="30-create-repetitions-table.sql"
                 splitStatements="true"
                 stripComments="true"/>
    </changeSet>

</databaseChangeLog>
```

### main\resources\db\changelog\v.1.0.0_initial-schema\30-create-repetitions-table.sql
```sql
CREATE TABLE repetitions
(

);
```

### main\resources\db\changelog\v.1.0.0_initial-schema\db.changelog-v.1.0.0_initial-schema.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <include file="01-changeset-users-table.xml" relativeToChangelogFile="true"/>
    <include file="10-changeset-collections-table.xml" relativeToChangelogFile="true"/>
    <include file="20-changeset-cards-table.xml" relativeToChangelogFile="true"/>

</databaseChangeLog>
```

### main\resources\db-init\initdb.sql
```sql
CREATE SCHEMA IF NOT EXISTS flashcards;
```

### main\resources\db.changelog-master.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
         http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.8.xsd">

    <preConditions>
        <dbms type="postgresql"/>
    </preConditions>

    <changeSet id="0" author="alyosander">
        <tagDatabase tag="db_init"/>
    </changeSet>

    <include file="/db/changelog/v.1.0.0_initial-schema/db.changelog-v.1.0.0_initial-schema.xml"/>

</databaseChangeLog>
```

### main\resources\graphql\card-review.graphqls
```
extend type Query {
    startLearning(collectionId: ID!): [Card!]!
}

extend type Mutation {
    reviewCard(cardId: ID!, answer: ReviewAnswer!): Card!
}

enum ReviewAnswer {
    AGAIN
    HARD
    GOOD
    EASY
}

```

### main\resources\graphql\card.graphqls
```
scalar LocalDateTime

extend type Query {
    card(id: ID!): Card
    cardsByCollectionId(collectionId: ID!): [Card!]!
}

extend type Mutation {
    saveCard(card: CardInp!): Card!
    deleteCard(card: CardInp!): Boolean!
    deleteCardsByCollectionId(collectionId: ID!): Int!
}

input CardInp {
    id: ID
    text: String!
    collectionId: ID!
}

type Card {
    id: ID!
    text: String!
    collection: Collection!
    createdAt: LocalDateTime!
    type: Int!
    queue: Int!
    due: Int!
    ivl: Int!
    factor: Int!
    reps: Int!
    lapses: Int!
    stepsLeft: Int!
    newIntervals: [NextInterval!]! # <‑‑ новое поле
}
```

### main\resources\graphql\collection.graphqls
```
extend type Query {
    collection(id: ID!): Collection
    collectionsByUserId(userId: ID!): [Collection]
}

extend type Mutation {
    saveCollection(collection: CollectionInp!): Collection
    deleteCollection(id: ID!): Boolean
}

input CollectionInp {
    id: ID
    name: String
    user: UserInp
    cards: [CardInp]
}

type Collection {
    id: ID!
    name: String!
    user: User
    cards: [Card]
    countCards: Int
    newCount: Int          # ← новые
    learningCount: Int     # ← learning + relearn
    reviewCount: Int       # ← к повторению
}

```

### main\resources\graphql\nextInterval.graphqls
```
enum IntervalUnit { MIN DAY }

type NextInterval {
    answer: ReviewAnswer!
    interval: Int!         # число
    unit: IntervalUnit! # MIN или DAY
}
```

### main\resources\graphql\user.graphqls
```
type Query {
    user(id: ID!): User!
    users: [User]
}

type Mutation {
    saveUser(user: UserInp!): User
}

type User {
    id: ID!
    email: String!
    password: String
    collections: [Collection]
}

input UserInp {
    id: ID
    email: String
    password: String
    collections: [CollectionInp]
}
```

# Задание
- 
