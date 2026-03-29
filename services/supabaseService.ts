import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const isBypass = () => typeof window !== 'undefined' && localStorage.getItem('ADMIN_BYPASS') === 'true';

// Helper to get/set mock data from localStorage
const getMockData = (table: string) => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`mock_${table}`);
  if (stored) return JSON.parse(stored);
  
  // Default data if none stored
  if (table === 'books') {
    return [
      { id: 'mock-1', title: 'O Enigma do Tempo', genre: 'Ficção Científica', author: 'Admin', owner_id: 'admin-bypass-id', status: 'writing', content: 'Era uma vez...', language: 'pt-BR', cover_url: 'https://picsum.photos/seed/enigma/600/800', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'mock-2', title: 'A Jornada do Herói', genre: 'Aventura', author: 'Admin', owner_id: 'admin-bypass-id', status: 'writing', content: 'O herói partiu...', language: 'pt-BR', cover_url: 'https://picsum.photos/seed/jornada/600/800', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  }
  if (table === 'clients') {
    return [
      { id: 'client-1', name: 'João Silva', email: 'joao@exemplo.com', owner_id: 'admin-bypass-id', created_at: new Date().toISOString() },
    ];
  }
  if (table === 'users') {
    return [
      { 
        id: 'admin-bypass-id', 
        email: 'admin@test.com', 
        display_name: 'Administrador de Teste', 
        onboarding_completed: true,
        created_at: new Date().toISOString() 
      },
    ];
  }
  return [];
};

const saveMockData = (table: string, data: any[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`mock_${table}`, JSON.stringify(data));
  }
};

// Initialize mock data
let mockBooks = getMockData('books');
let mockClients = getMockData('clients');
let mockUsers = getMockData('users');

const listeners: { [key: string]: { callback: (data: any[]) => void; filter: { column: string; value: any } }[] } = {};

const notifyListeners = (table: string) => {
  if (listeners[table]) {
    const allData: any[] = table === 'books' ? mockBooks : (table === 'clients' ? mockClients : mockUsers);
    listeners[table].forEach(({ callback, filter }) => {
      const filteredData = allData.filter(item => item[filter.column] === filter.value);
      callback([...filteredData]);
    });
  }
};

export const supabaseService = {
  async getDocument(table: string, id: string) {
    if (isBypass()) {
      const data: any[] = table === 'books' ? mockBooks : (table === 'clients' ? mockClients : mockUsers);
      return data.find(item => item.id === id) || null;
    }
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching document from ${table}:`, error);
      throw error;
    }
    return data;
  },

  async getCollection(table: string, filters: { column: string; operator: string; value: any }[] = []) {
    if (isBypass()) {
      let data: any[] = table === 'books' ? [...mockBooks] : (table === 'clients' ? [...mockClients] : [...mockUsers]);
      filters.forEach(filter => {
        if (filter.operator === '==') {
          data = data.filter(item => item[filter.column] === filter.value);
        }
      });
      return data;
    }
    let query = supabase.from(table).select('*');

    filters.forEach(filter => {
      switch (filter.operator) {
        case '==':
          query = query.eq(filter.column, filter.value);
          break;
        case '!=':
          query = query.neq(filter.column, filter.value);
          break;
        case '>':
          query = query.gt(filter.column, filter.value);
          break;
        case '<':
          query = query.lt(filter.column, filter.value);
          break;
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching collection from ${table}:`, error);
      throw error;
    }
    return data;
  },

  async addDocument(table: string, data: any) {
    if (isBypass()) {
      const id = `mock-id-${Math.random().toString(36).substr(2, 9)}`;
      const newItem = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      if (table === 'books') {
        mockBooks.push(newItem);
        saveMockData('books', mockBooks);
      } else if (table === 'clients') {
        mockClients.push(newItem);
        saveMockData('clients', mockClients);
      } else if (table === 'users') {
        mockUsers.push(newItem);
        saveMockData('users', mockUsers);
      }
      notifyListeners(table);
      return id;
    }
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert([{ ...data, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      console.error(`Error adding document to ${table}:`, error);
      toast.error(`Erro ao salvar em ${table}: ${error.message} (${error.code})`);
      throw new Error(`Erro ao adicionar documento em ${table}: ${error.message}`);
    }

    if (!insertedData) {
      throw new Error(`Erro ao adicionar documento em ${table}: Nenhum dado retornado`);
    }

    return insertedData.id;
  },

  async saveBook(bookData: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !isBypass()) throw new Error('Usuário não autenticado');

    const payload = {
      ...bookData,
      owner_id: user?.id || 'admin-bypass-id',
      updated_at: new Date().toISOString()
    };

    if (bookData.id) {
      return this.updateDocument('books', bookData.id, payload);
    } else {
      return this.addDocument('books', payload);
    }
  },

  async saveUser(userData: any) {
    if (isBypass()) {
      const id = 'admin-bypass-id';
      const existingIndex = mockUsers.findIndex(u => u.id === id);
      if (existingIndex >= 0) {
        mockUsers[existingIndex] = { ...mockUsers[existingIndex], ...userData, updated_at: new Date().toISOString() };
      } else {
        mockUsers.push({ id, email: 'admin@test.com', ...userData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      saveMockData('users', mockUsers);
      notifyListeners('users');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const id = user.id;
    const email = user.email;
    
    console.log('Oráculo: Saving user data:', { id, email, ...userData });
    const { error } = await supabase
      .from('users')
      .upsert({
        id,
        email,
        ...userData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error saving user to Supabase:', {
        error,
        userId: id,
        email,
        data: userData
      });
      throw new Error(`Erro ao salvar dados do usuário: ${error.message} (${error.code})`);
    }
  },

  async getProfile() {
    if (isBypass()) {
      const id = 'admin-bypass-id';
      return mockUsers.find(u => u.id === id) || {
        id: 'admin-bypass-id',
        email: 'admin@test.com',
        display_name: 'Administrador de Teste',
        onboarding_completed: true,
        created_at: new Date().toISOString()
      };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const id = user.id;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      throw error;
    }
    return data;
  },

  async updateDocument(table: string, id: string, data: any) {
    if (isBypass()) {
      if (table === 'books') {
        mockBooks = mockBooks.map(item => item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item);
        saveMockData('books', mockBooks);
      } else if (table === 'clients') {
        mockClients = mockClients.map(item => item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item);
        saveMockData('clients', mockClients);
      } else if (table === 'users') {
        mockUsers = mockUsers.map(item => item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item);
        saveMockData('users', mockUsers);
      }
      notifyListeners(table);
      return;
    }
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id);

    if (error) {
      console.error(`Error updating document in ${table}:`, error);
      throw error;
    }
  },

  async deleteDocument(table: string, id: string) {
    if (isBypass()) {
      if (table === 'books') {
        mockBooks = mockBooks.filter(item => item.id !== id);
        saveMockData('books', mockBooks);
      } else if (table === 'clients') {
        mockClients = mockClients.filter(item => item.id !== id);
        saveMockData('clients', mockClients);
      } else if (table === 'users') {
        mockUsers = mockUsers.filter(item => item.id !== id);
        saveMockData('users', mockUsers);
      }
      notifyListeners(table);
      return;
    }
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting document from ${table}:`, error);
      throw error;
    }
  },

  subscribeToCollection(table: string, filter: { column: string; value: any }, callback: (data: any[]) => void) {
    if (isBypass()) {
      if (!listeners[table]) listeners[table] = [];
      listeners[table].push({ callback, filter });
      
      const allData: any[] = table === 'books' ? mockBooks : (table === 'clients' ? mockClients : mockUsers);
      callback(allData.filter(item => item[filter.column] === filter.value));
      
      return () => {
        listeners[table] = listeners[table].filter(l => l.callback !== callback);
      };
    }

    // Initial fetch
    supabase
      .from(table)
      .select('*')
      .eq(filter.column, filter.value)
      .then(({ data }) => {
        if (data) callback(data);
      });

    const channel = supabase
      .channel(`${table}-changes-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${filter.column}=eq.${filter.value}`
        },
        async () => {
          // Re-fetch the collection to get the latest state
          const { data } = await supabase
            .from(table)
            .select('*')
            .eq(filter.column, filter.value);
          if (data) callback(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
