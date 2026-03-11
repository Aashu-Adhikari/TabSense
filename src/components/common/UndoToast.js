import React, { useState, useEffect } from 'react';

const UndoToast = ({ onUndo, expiresAt }) => {
    const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
            setSecondsLeft(remaining);

            if (remaining <= 0) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiresAt]);

    return (
        <div className="undo-toast">
            <div className="undo-toast-content">
                <strong>Group Deleted</strong>
                <div className="undo-toast-timer">UNDO is available for {secondsLeft}s</div>
            </div>
            <button className="undo-toast-btn" onClick={onUndo}>
                UNDO
            </button>
        </div>
    );
};

export default UndoToast;
