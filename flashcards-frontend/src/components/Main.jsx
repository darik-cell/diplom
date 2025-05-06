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
