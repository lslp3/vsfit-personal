/**
 * personalPageHeader — integração do header GLOBAL do PersonalShell.
 *
 * Regra de layout (correção estrutural): para rotas /personal/* existe UM
 * único header responsável pelo topo: o header do PersonalShell
 * (sticky + sólido + safe-area-top). Páginas NÃO podem mais renderizar uma
 * segunda barra de topo.
 *
 * Páginas que antes tinham header próprio registram aqui, via hook, apenas o
 * que o header global precisa saber: título dinâmico, botão voltar (telas de
 * detalhe/subfluxo) e ações à direita (ex.: Atualizar / Sincronizar / Editar).
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface PersonalPageHeader {
  /** Título exibido no header global (sobrepõe o título derivado da rota). */
  title?: string;
  /** Exibe o botão voltar no header global (subfluxos/detalhes). */
  back?: boolean;
  /** Ações à direita no header global (sem criar segunda barra). */
  right?: ReactNode;
}

interface PersonalHeaderContextValue {
  header: PersonalPageHeader;
  setHeader: (next: PersonalPageHeader) => void;
}

const PersonalHeaderContext = createContext<PersonalHeaderContextValue | null>(null);

export function PersonalHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PersonalPageHeader>({});
  return (
    <PersonalHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PersonalHeaderContext.Provider>
  );
}

function usePersonalHeaderContext(): PersonalHeaderContextValue {
  const ctx = useContext(PersonalHeaderContext);
  if (!ctx) {
    throw new Error(
      'usePersonalHeader* deve ser usado dentro de <PersonalHeaderProvider> (PersonalShell).'
    );
  }
  return ctx;
}

/** Leitura do estado atual do header global (usado pelo PersonalShell). */
export function usePersonalHeader(): PersonalPageHeader {
  return usePersonalHeaderContext().header;
}

/** Setter bruto — para páginas com header DINÂMICO (detalhe, carregamento). */
export function usePersonalHeaderSetter() {
  return usePersonalHeaderContext().setHeader;
}

/**
 * Registra título/back/ações da página no header global (limpo no unmount).
 * Uso: estático — chamar no topo do componente da página.
 */
export function usePersonalPageHeader(header?: PersonalPageHeader) {
  const { setHeader } = usePersonalHeaderContext();
  const headerRef = useRef(header);
  headerRef.current = header;

  useEffect(() => {
    setHeader(headerRef.current ?? {});
    return () => setHeader({});
  }, [setHeader]);
}
