"use client";

import { Card } from "./Card";

interface ClientCardProps {
  data: CardData;
  active: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({ data, active }) => {
  return <Card data={data} active={active} />;
};

export default ClientCard;
