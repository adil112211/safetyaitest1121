import { useState } from 'react';
import { Phone, Shield, CheckCircle } from 'lucide-react';

interface PhoneAuthProps {
  onPhoneReceived: (phoneNumber: string) => void;
}

export function PhoneAuth({ onPhoneReceived }: PhoneAuthProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestPhoneNumber() {
    setIsRequesting(true);
    setError(null);

    try {
      const tg = window.Telegram?.WebApp;

      if (!tg) {
        throw new Error('Telegram WebApp не доступен');
      }

      tg.requestContact((status, data) => {
        if (status) {
          const phoneNumber = data?.responseUnsafe?.contact?.phone_number;

          if (phoneNumber) {
            onPhoneReceived(phoneNumber);
          } else {
            setError('Не удалось получить номер телефона');
            setIsRequesting(false);
          }
        } else {
          setError('Вы отменили предоставление номера');
          setIsRequesting(false);
        }
      });
    } catch (err) {
      console.error('[PhoneAuth] Error:', err);
      setError('Произошла ошибка при запросе номера телефона');
      setIsRequesting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Добро пожаловать в SafetyAI
            </h1>
            <p className="text-slate-600">
              Для доступа к платформе обучения необходимо подтвердить ваш номер телефона
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3 text-sm">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700">
                Ваш номер используется только для идентификации и безопасности
              </p>
            </div>
            <div className="flex items-start space-x-3 text-sm">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700">
                Мы не передаем ваши данные третьим лицам
              </p>
            </div>
            <div className="flex items-start space-x-3 text-sm">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-700">
                Одноразовая регистрация для полного доступа
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={requestPhoneNumber}
            disabled={isRequesting}
            className={`
              w-full py-4 px-6 rounded-xl font-medium text-white
              flex items-center justify-center space-x-2
              transition-all duration-200
              ${isRequesting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
              }
            `}
          >
            <Phone className="w-5 h-5" />
            <span>
              {isRequesting ? 'Ожидание...' : 'Поделиться номером телефона'}
            </span>
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности
          </p>
        </div>
      </div>
    </div>
  );
}
