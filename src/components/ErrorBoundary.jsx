import { Component } from 'react';
import { resetSaved } from '../state/persist.js';

// Если игра упала, показываем выход вместо белого экрана: перезагрузка или сброс сохранения.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  reset = async () => {
    if (!window.confirm('Удалить сохранение и начать заново?')) return;
    await resetSaved();
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen">
        <h2 className="h2">Что-то пошло не так</h2>
        <p className="note">
          Игра упала. Обычно помогает перезагрузка. Если ошибка повторяется, сохранение могло повредиться:
          тогда его можно сбросить.
        </p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
        <button className="btn" onClick={this.reset}>
          Сбросить сохранение
        </button>
      </div>
    );
  }
}
