import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, Bell, Cake, UserX, Plus, Settings, Zap, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const SMSPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [salonId, setSalonId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Campaign state
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [inactiveMonths, setInactiveMonths] = useState('3');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [clientsCount, setClientsCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // Automation state
  const [settings, setSettings] = useState({
    reminder_enabled: false,
    reminder_hours_before: 24,
    reminder_message: 'Bonjour {prenom}, rappel de votre RDV le {date} a {heure} pour {prestation}. A bientot !',
    birthday_enabled: false,
    birthday_message: 'Bonjour {prenom}, toute l equipe vous souhaite un joyeux anniversaire !',
    reactivation_enabled: false,
    reactivation_months: 3,
    reactivation_message: 'Bonjour {prenom}, cela fait longtemps qu on ne vous a pas vu ! Revenez nous rendre visite.',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Twilio settings
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  // Logs
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadSalonId();
    }
  }, [user]);

  useEffect(() => {
    if (salonId) {
      loadCampaigns();
      loadSettings();
      loadLogs();
      loadClientsCount();
    }
  }, [salonId]);

  const loadSalonId = async () => {
    const { data } = await supabase.rpc('get_user_salon_id', { _user_id: user!.id });
    if (data) setSalonId(data);
  };

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('sms_campaigns')
      .select('*')
      .eq('salon_id', salonId!)
      .order('sent_at', { ascending: false });
    if (data) setCampaigns(data);
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('sms_settings')
      .select('*')
      .eq('salon_id', salonId!)
      .single();
    if (data) {
      setSettings({
        reminder_enabled: data.reminder_enabled ?? false,
        reminder_hours_before: data.reminder_hours_before ?? 24,
        reminder_message: data.reminder_message ?? settings.reminder_message,
        birthday_enabled: data.birthday_enabled ?? false,
        birthday_message: data.birthday_message ?? settings.birthday_message,
        reactivation_enabled: data.reactivation_enabled ?? false,
        reactivation_months: data.reactivation_months ?? 3,
        reactivation_message: data.reactivation_message ?? settings.reactivation_message,
      });
      setTwilioSid(data.twilio_account_sid ?? '');
      setTwilioToken(data.twilio_auth_token ?? '');
      setTwilioPhone(data.twilio_phone_number ?? '');
    }
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('salon_id', salonId!)
      .order('sent_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data);
  };

  const loadClientsCount = async () => {
    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('salon_id', salonId!)
      .neq('sms_opt_out', true);
    setClientsCount(count ?? 0);
  };

  const insertVariable = (variable: string, setter: (fn: (prev: string) => string) => void) => {
    setter((prev: string) => prev + variable);
  };

  const smsCount = (msg: string) => Math.max(1, Math.ceil(msg.length / 160));

  const handleSendCampaign = async () => {
    setShowConfirm(false);
    setSendingCampaign(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-campaign', {
        body: {
          salon_id: salonId,
          message: campaignMessage,
          recipient_type: recipientType,
          inactive_months: recipientType === 'inactive' ? parseInt(inactiveMonths) : undefined,
          campaign_name: campaignName,
        },
      });
      if (error) throw error;
      toast({ title: 'Campagne envoyée', description: `${data.sent} SMS envoyés, ${data.failed} échoués` });
      setCampaignName('');
      setCampaignMessage('');
      setShowNewCampaign(false);
      loadCampaigns();
      loadLogs();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSendingCampaign(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase.from('sms_settings').upsert({
        salon_id: salonId!,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'salon_id' });
      if (error) throw error;
      toast({ title: 'Automatisations sauvegardées' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveTwilio = async () => {
    setSavingTwilio(true);
    try {
      const { error } = await supabase.from('sms_settings').upsert({
        salon_id: salonId!,
        twilio_account_sid: twilioSid,
        twilio_auth_token: twilioToken,
        twilio_phone_number: twilioPhone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'salon_id' });
      if (error) throw error;
      toast({ title: 'Paramètres Twilio sauvegardés' });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setSavingTwilio(false);
    }
  };

  const handleTestSms = async () => {
    setTestingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-test', {
        body: { salon_id: salonId },
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: 'SMS test envoyé !' });
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setTestingSms(false);
    }
  };

  // VariableButtons extracted outside component below

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Campagnes SMS</h1>
            <p className="text-muted-foreground">Gérez vos campagnes et automatisations SMS</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Campagnes
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automatisations
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* CAMPAIGNS TAB */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Campagnes envoyées</h2>
              <Button onClick={() => setShowNewCampaign(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nouvelle campagne
              </Button>
            </div>

            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune campagne envoyée pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Destinataires</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{format(new Date(c.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                          <TableCell>{c.recipients_count}</TableCell>
                          <TableCell>
                            <Badge variant={c.recipient_type === 'all' ? 'default' : 'secondary'}>
                              {c.recipient_type === 'all' ? 'Tous' : `Inactifs ${c.inactive_months}m`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* New Campaign Dialog */}
            <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nouvelle campagne SMS</DialogTitle>
                  <DialogDescription>Envoyez un SMS à vos clients</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nom de la campagne</Label>
                    <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Promo été 2026" />
                  </div>
                  <div>
                    <Label>Destinataires</Label>
                    <Select value={recipientType} onValueChange={setRecipientType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les clients ({clientsCount})</SelectItem>
                        <SelectItem value="inactive">Clients inactifs</SelectItem>
                      </SelectContent>
                    </Select>
                    {recipientType === 'inactive' && (
                      <Select value={inactiveMonths} onValueChange={setInactiveMonths}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((m) => (
                            <SelectItem key={m} value={String(m)}>Inactifs depuis {m} mois</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={campaignMessage}
                      onChange={(e) => setCampaignMessage(e.target.value)}
                      placeholder="Rédigez votre message..."
                      rows={4}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <VariableButtons
                        variables={['{prenom}', '{nom}']}
                        onInsert={(v) => insertVariable(v, setCampaignMessage)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {campaignMessage.length} car. · {smsCount(campaignMessage)} SMS
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewCampaign(false)}>Annuler</Button>
                  <Button
                    onClick={() => setShowConfirm(true)}
                    disabled={!campaignName || !campaignMessage}
                  >
                    <Send className="h-4 w-4 mr-2" /> Envoyer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer l'envoi</DialogTitle>
                  <DialogDescription>
                    Vous allez envoyer "{campaignName}" à {recipientType === 'all' ? clientsCount : '?'} destinataires.
                    Cette action est irréversible.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirm(false)}>Annuler</Button>
                  <Button onClick={handleSendCampaign} disabled={sendingCampaign}>
                    {sendingCampaign ? 'Envoi en cours...' : 'Confirmer l\'envoi'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* AUTOMATIONS TAB */}
          <TabsContent value="automations" className="space-y-4">
            {/* Reminder */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">Rappel de RDV</CardTitle>
                      <CardDescription>Envoyez un rappel automatique avant chaque rendez-vous</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.reminder_enabled}
                    onCheckedChange={(v) => setSettings({ ...settings, reminder_enabled: v })}
                  />
                </div>
              </CardHeader>
              {settings.reminder_enabled && (
                <CardContent className="space-y-3">
                  <div>
                    <Label>Envoyer</Label>
                    <Select
                      value={String(settings.reminder_hours_before)}
                      onValueChange={(v) => setSettings({ ...settings, reminder_hours_before: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2, 4, 12, 24, 48].map((h) => (
                          <SelectItem key={h} value={String(h)}>{h} heures avant</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={settings.reminder_message}
                      onChange={(e) => setSettings({ ...settings, reminder_message: e.target.value })}
                      rows={3}
                    />
                    <VariableButtons
                      variables={['{prenom}', '{date}', '{heure}', '{prestation}']}
                      onInsert={(v) => setSettings({ ...settings, reminder_message: settings.reminder_message + v })}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Birthday */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cake className="h-5 w-5 text-pink-500" />
                    <div>
                      <CardTitle className="text-base">SMS Anniversaire</CardTitle>
                      <CardDescription>Envoyez un message le jour de l'anniversaire de vos clients</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.birthday_enabled}
                    onCheckedChange={(v) => setSettings({ ...settings, birthday_enabled: v })}
                  />
                </div>
              </CardHeader>
              {settings.birthday_enabled && (
                <CardContent>
                  <Label>Message</Label>
                  <Textarea
                    value={settings.birthday_message}
                    onChange={(e) => setSettings({ ...settings, birthday_message: e.target.value })}
                    rows={3}
                  />
                  <VariableButtons
                    variables={['{prenom}']}
                    onInsert={(v) => setSettings({ ...settings, birthday_message: settings.birthday_message + v })}
                  />
                </CardContent>
              )}
            </Card>

            {/* Reactivation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserX className="h-5 w-5 text-orange-500" />
                    <div>
                      <CardTitle className="text-base">Relance clients inactifs</CardTitle>
                      <CardDescription>Relancez automatiquement les clients qui ne sont pas venus depuis longtemps</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.reactivation_enabled}
                    onCheckedChange={(v) => setSettings({ ...settings, reactivation_enabled: v })}
                  />
                </div>
              </CardHeader>
              {settings.reactivation_enabled && (
                <CardContent className="space-y-3">
                  <div>
                    <Label>Inactifs depuis</Label>
                    <Select
                      value={String(settings.reactivation_months)}
                      onValueChange={(v) => setSettings({ ...settings, reactivation_months: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((m) => (
                          <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={settings.reactivation_message}
                      onChange={(e) => setSettings({ ...settings, reactivation_message: e.target.value })}
                      rows={3}
                    />
                    <VariableButtons
                      variables={['{prenom}']}
                      onInsert={(v) => setSettings({ ...settings, reactivation_message: settings.reactivation_message + v })}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
              {savingSettings ? 'Sauvegarde...' : 'Sauvegarder les automatisations'}
            </Button>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connexion Twilio</CardTitle>
                <CardDescription>Configurez votre compte Twilio pour envoyer des SMS</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Account SID</Label>
                  <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} placeholder="ACxxxxxxxxx" />
                </div>
                <div>
                  <Label>Auth Token</Label>
                  <Input type="password" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} placeholder="••••••••" />
                </div>
                <div>
                  <Label>Numéro d'envoi</Label>
                  <Input value={twilioPhone} onChange={(e) => setTwilioPhone(e.target.value)} placeholder="+33xxxxxxxxx" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTwilio} disabled={savingTwilio}>
                    {savingTwilio ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                  <Button variant="outline" onClick={handleTestSms} disabled={testingSms || !twilioSid}>
                    {testingSms ? 'Envoi...' : 'Tester'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historique des SMS</CardTitle>
                <CardDescription>Derniers SMS envoyés</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground">Aucun SMS envoyé</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                          <TableCell className="font-mono text-sm">{log.phone_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                              {log.status === 'sent' ? 'Envoyé' : 'Échoué'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default SMSPage;
