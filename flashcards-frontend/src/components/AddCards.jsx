import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';

// Новый подход: react-markdown + rehype-katex
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const GET_COLLECTION = gql`
    query GetCollection($id: ID!) {
        collection(id: $id) {
            id
            name
        }
    }
`;

const AddCards = () => {
    const { collectionId } = useParams();
    const { loading, error, data } = useQuery(GET_COLLECTION, {
        variables: { id: collectionId },
    });

    const [cardText, setCardText] = useState("");

    if (loading) {
        return <Container className="mt-4">Загрузка...</Container>;
    }
    if (error) {
        return <Container className="mt-4">Ошибка: {error.message}</Container>;
    }

    return (
        <Container fluid className="mt-4 px-0">
            <Row className="align-items-center mx-0">
                <Col>
                    <h2>Редактор ({data.collection.name})</h2>
                </Col>
                <Col className="text-end">
                    <h2>Предпросмотр</h2>
                </Col>
            </Row>
            <hr />

            <Row className="mx-0" style={{ height: 'calc(100vh - 160px)' }}>
                <Col md={6} className="px-0" style={{ borderRight: '1px solid #ccc' }}>
                    <div style={{ height: '100%', overflowY: 'auto' }}>
                        <CodeMirror
                            value={cardText}
                            theme={githubLight}
                            extensions={[markdown()]}
                            onChange={(value) => setCardText(value)}
                        />
                    </div>
                </Col>

                <Col md={6} className="px-3" style={{ overflowY: 'auto' }}>
                    <div className="markdown-body">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                        >
                            {cardText}
                        </ReactMarkdown>
                    </div>
                </Col>
            </Row>

            <div className="d-flex justify-content-end p-3" style={{ borderTop: '1px solid #ccc' }}>
                <Button variant="primary" size="sm">
                    Добавить карточку
                </Button>
            </div>
        </Container>
    );
};

export default AddCards;
