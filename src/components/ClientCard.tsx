"use client";

import { Card } from "./Card";
import type { CardData } from '@/@typings';

interface ClientCardProps {
  data: CardData;
  active: boolean;
  cardId?: string;
  chapterId?: string;
}

const ClientCard: React.FC<ClientCardProps> = ({ data, active, cardId, chapterId }) => {
  return <Card data={data} active={active} cardId={cardId} chapterId={chapterId} />;
};

export default ClientCard;
