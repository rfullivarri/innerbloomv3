import { DailyReminderSettings } from '../../components/settings/DailyReminderSettings';
import { Navbar } from '../../components/layout/Navbar';
import { Card } from '../../components/common/Card';

export default function SettingsNotificationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar title="Notificaciones" />
      <main className="flex-1 pb-16 pt-6">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Card
              title="Recordatorios diarios"
              subtitle="Activá el correo diario para mantenerte al día con tu Daily Quest."
              className="text-text"
            >
              <DailyReminderSettings />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
