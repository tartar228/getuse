import { useState } from 'react';
import { userInfo } from '../telegram.js';

// Аватар игрока из профиля Telegram; если фото нет или оно не загрузилось, показываем первую букву имени
export default function UserAvatar({ className = '' }) {
  const u = userInfo();
  const [failed, setFailed] = useState(false);
  return (
    <span className={`uav ${className}`}>
      {u.photo && !failed ? (
        <img src={u.photo} alt="" referrerPolicy="no-referrer" draggable="false" onError={() => setFailed(true)} />
      ) : (
        u.initial
      )}
    </span>
  );
}
