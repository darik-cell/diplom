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
