/* Modo de la app (un solo interruptor):
   'servidor' = con la computadora de la casa: sincroniza celular y PC (serve.py).
   'telefono' = SOLO TELÉFONO: no usa ningún servidor; los gastos viven solo en este teléfono. Se publica como página web instalable. */
window.APP_MODE = 'telefono';
window.SOLO_TELEFONO = window.APP_MODE === 'telefono';
