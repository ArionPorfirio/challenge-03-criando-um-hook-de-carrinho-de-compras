import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    let msg = 'Erro na adição do produto';

    try {
      const stockResponse = await api.get(`stock/${productId}`);

      if (stockResponse.status === 404) {
        throw Error;
      }

      const stockQuantity = Number(stockResponse.data.amount);

      const productInCartIndex = cart.findIndex(
        product => product.id === productId,
      );

      const newCart = [...cart];

      if (productInCartIndex >= 0) {
        if (stockQuantity < cart[productInCartIndex].amount + 1) {
          msg = 'Quantidade solicitada fora de estoque';
          throw Error;
        }

        newCart[productInCartIndex].amount += 1;
      } else {
        if (stockQuantity <= 1) {
          msg = 'Quantidade solicitada fora de estoque';
          throw Error;
        }

        const productResponse = await api.get(`products/${productId}`);

        newCart.push({ ...productResponse.data, amount: 1 });
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error(msg);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removeProductFromIndex = cart.findIndex(
        product => product.id === productId,
      );

      if (removeProductFromIndex < 0) {
        throw Error;
      }

      const newCart = [...cart];

      newCart.splice(removeProductFromIndex, 1);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    let msg = '';

    try {
      const cartProductIndex = cart.findIndex(
        product => product.id === productId,
      );

      if (cartProductIndex < 0) {
        msg = 'Erro na alteração de quantidade do produto';
        throw Error;
      }

      const response = await api.get(`stock/${productId}`);

      if (!response.data) {
        throw Error;
      }

      const newProductAmount =
        cart[cartProductIndex].amount + (amount > 0 ? 1 : -1);

      if (
        response.data.amount <= 0 ||
        response.data.amount < newProductAmount ||
        newProductAmount < 1
      ) {
        msg = 'Quantidade solicitada fora de estoque';
        throw Error;
      }

      const newCart = [...cart];
      newCart[cartProductIndex].amount = newProductAmount;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error(msg);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
