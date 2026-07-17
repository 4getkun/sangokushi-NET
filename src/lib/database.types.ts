// supabase/migrations/ の実スキーマに合わせて手書きしたDB型。
// スキーマを変更した場合は `supabase gen types typescript` で生成し直すのが望ましい。

export type ItemKind = 'weapon' | 'book';
export type MailRecipientKind = 'town' | 'unit' | 'country' | 'character';
export type OfferStatus = 'pending' | 'accepted' | 'declined';
export type BbsScope = 'country' | 'all';
export type MapLogChannel = 'event' | 'chronicle';

export type CharacterRow = {
  id: string;
  login_name: string;
  display_name: string;
  portrait: number;
  str: number;
  int_stat: number;
  leadership: number;
  charisma: number;
  soldiers: number;
  training: number;
  country_id: number | null;
  gold: number;
  rice: number;
  merit: number;
  rank_points: number;
  weapon_id: number;
  book_id: number;
  loyalty: number;
  str_ex: number;
  int_ex: number;
  lea_ex: number;
  cha_ex: number;
  soldier_type: number;
  battle_wins: number;
  idle_turns: number;
  position_town_id: number | null;
  motto: string;
  last_host: string | null;
  next_turn_due_at: string;
  email_verified: boolean;
  created_at: string;
}

export type TownRow = {
  id: number;
  name: string;
  country_id: number | null;
  population: number;
  agri: number;
  agri_cap: number;
  commerce: number;
  commerce_cap: number;
  castle: number;
  castle_cap: number;
  loyalty: number;
  x: number;
  y: number;
  market_rate: number;
  castle_defense: number;
  tech: number;
  updated_at: string;
}

export type CountryRow = {
  id: number;
  name: string;
  element: number;
  founded_turns: number;
  king_character_id: string | null;
  gunshi_character_id: string | null;
  dai_character_id: string | null;
  uma_character_id: string | null;
  goei_character_id: string | null;
  yumi_character_id: string | null;
  hei_character_id: string | null;
  announcement: string;
  entry_message: string;
  priority: number;
  created_at: string;
}

export type TownAdjacencyRow = {
  town_id: number;
  adjacent_town_id: number;
}

export type ItemCatalogRow = {
  kind: ItemKind;
  id: number;
  name: string;
  price: number;
  bonus: number;
  weight: number;
  element: number;
  stat_req: number;
  category: string;
  town_restriction: number;
}

export type CommandQueueRow = {
  character_id: string;
  slot_index: number;
  command_code: number;
  label: string;
  reserved_at: string | null;
  cno: string | null;
  csub: string | null;
  cnum: number | null;
  cend: string | null;
}

export type CharacterLogRow = {
  id: number;
  character_id: string;
  message: string;
  created_at: string;
}

export type MapLogRow = {
  id: number;
  channel: MapLogChannel;
  message: string;
  created_at: string;
}

export type TownGarrisonRow = {
  character_id: string;
  town_id: number;
  country_id: number | null;
  created_at: string;
}

export type UnitRow = {
  id: number;
  name: string;
  country_id: number;
  leader_character_id: string;
  recruit_message: string;
  recruiting_closed: boolean;
  created_at: string;
}

export type UnitMemberRow = {
  unit_id: number;
  character_id: string;
  is_leader: boolean;
  joined_at: string;
}

export type MailMessageRow = {
  id: number;
  recipient_kind: MailRecipientKind;
  recipient_town_id: number | null;
  recipient_unit_id: number | null;
  recipient_country_id: number | null;
  recipient_character_id: string | null;
  sender_character_id: string;
  sender_town_id: number | null;
  sender_country_id: number | null;
  sender_unit_id: number | null;
  body: string;
  created_at: string;
}

export type RecruitmentOfferRow = {
  id: number;
  target_character_id: string;
  offering_character_id: string;
  offering_town_id: number;
  offering_country_id: number;
  message: string;
  status: OfferStatus;
  created_at: string;
  responded_at: string | null;
}

export type CountryBbsPostRow = {
  id: number;
  country_id: number;
  author_character_id: string;
  title: string;
  body: string;
  scope: BbsScope;
  parent_post_id: number | null;
  created_at: string;
}

export type LocalRulePostRow = {
  id: number;
  country_id: number;
  author_character_id: string;
  body: string;
  scope: BbsScope;
  created_at: string;
}

export type GameClockRow = {
  singleton: true;
  year: number;
  month: number;
  last_rollover_at: string;
}

export type GameConfigRow = {
  key: string;
  value: number;
  note: string | null;
}

type TableDef<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      characters: TableDef<CharacterRow>;
      towns: TableDef<TownRow>;
      countries: TableDef<CountryRow>;
      town_adjacency: TableDef<TownAdjacencyRow>;
      item_catalog: TableDef<ItemCatalogRow>;
      command_queue: TableDef<CommandQueueRow>;
      character_logs: TableDef<CharacterLogRow>;
      map_log: TableDef<MapLogRow>;
      town_garrisons: TableDef<TownGarrisonRow>;
      units: TableDef<UnitRow>;
      unit_members: TableDef<UnitMemberRow>;
      mail_messages: TableDef<MailMessageRow>;
      recruitment_offers: TableDef<RecruitmentOfferRow>;
      country_bbs_posts: TableDef<CountryBbsPostRow>;
      local_rule_posts: TableDef<LocalRulePostRow>;
      game_clock: TableDef<GameClockRow>;
      game_config: TableDef<GameConfigRow>;
    };
    Views: Record<string, never>;
    Functions: {
      create_character: {
        Args: {
          p_login_name: string;
          p_display_name: string;
          p_portrait: number;
          p_town_id: number;
          p_str: number;
          p_int: number;
          p_lea: number;
          p_new_country_name?: string | null;
          p_new_country_element?: number | null;
        };
        Returns: CharacterRow;
      };
      reserve_command: {
        Args: {
          p_slot_indices: number[];
          p_command_code: number;
          p_target_town_id?: number | null;
          p_target_item_id?: number | null;
          p_quantity?: number | null;
          p_troop_type?: number | null;
          p_buy_type?: number | null;
          p_stat_choice?: number | null;
          p_target_character_id?: string | null;
          p_message?: string | null;
        };
        Returns: void;
      };
      king_directive: { Args: { p_message: string }; Returns: void };
      king_appoint: { Args: { p_target_character_id: string; p_role: number }; Returns: void };
      king_dismiss: { Args: { p_target_character_id: string }; Returns: void };
      king_set_entry_message: { Args: { p_message: string }; Returns: void };
      respond_recruitment_offer: { Args: { p_offer_id: number; p_accept: boolean }; Returns: void };
      send_mail: {
        Args: {
          p_recipient_kind: MailRecipientKind;
          p_recipient_character_id?: string | null;
          p_recipient_country_id?: number | null;
          p_body?: string | null;
        };
        Returns: void;
      };
      post_country_bbs: {
        Args: { p_title: string; p_body: string; p_scope?: BbsScope; p_parent_post_id?: number | null };
        Returns: void;
      };
      post_local_rule: { Args: { p_body: string; p_scope?: BbsScope }; Returns: void };
      delete_local_rule: { Args: { p_rule_id: number }; Returns: void };
      set_loyalty: { Args: { p_value: number }; Returns: void };
      create_unit: { Args: { p_name: string; p_message: string }; Returns: void };
      join_unit: { Args: { p_unit_id: number }; Returns: void };
      toggle_unit_recruiting: { Args: Record<string, never>; Returns: void };
      leave_or_disband_unit: { Args: Record<string, never>; Returns: void };
      expel_unit_member: { Args: { p_target_character_id: string }; Returns: void };
      gcfg: { Args: { p_key: string }; Returns: number };
    };
  };
}
